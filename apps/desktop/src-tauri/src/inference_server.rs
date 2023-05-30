use actix_web::dev::ServerHandle;
use actix_web::web::{Bytes, Json};

use actix_web::{get, post, App, HttpResponse, HttpServer, Responder};
use once_cell::sync::Lazy;
use parking_lot::{Mutex, RwLock};
use serde::Serialize;
use std::collections::HashMap;
use tauri::AppHandle;

use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};

use crate::abort_stream::AbortStream;
use crate::inference_thread::{start_inference, CompletionRequest, InferenceThreadRequest};
use crate::model_pool::{self, spawn_pool};
use crate::path::get_app_dir_path_buf;
use llm::Model;

static _LOADED_MODELMAP: Lazy<Mutex<HashMap<String, Box<dyn Model>>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

pub struct InferenceServerState {
    server: Arc<Mutex<Option<ServerHandle>>>,
    running: AtomicBool,
}

impl Default for InferenceServerState {
    fn default() -> Self {
        Self {
            server: Arc::new(Mutex::new(None)),
            running: AtomicBool::new(false),
        }
    }
}

#[get("/")]
async fn ping() -> impl Responder {
    HttpResponse::Ok().body("pong")
}

#[derive(Serialize)]
struct ModelInfo {
    id: String,
}

#[post("/model")]
async fn post_model() -> impl Responder {
    HttpResponse::Ok().json(ModelInfo {
        id: String::from("local.ai"),
    })
}

#[post("/completions")]
async fn post_completions(payload: Json<CompletionRequest>) -> impl Responder {
    println!("Received completion request: {:?}", payload.0);

    if model_pool::is_empty() {
        println!("No model loaded or available in the pool.");
        return HttpResponse::ServiceUnavailable().finish();
    }

    let (token_sender, receiver) = flume::unbounded::<Bytes>();

    let model_guard = match model_pool::get_model() {
        Some(guard) => guard,
        None => {
            println!("No model available.");
            return HttpResponse::ServiceUnavailable().finish();
        }
    };

    let abort_flag = Arc::new(RwLock::new(false));

    let inference_thread = match start_inference(InferenceThreadRequest {
        model_guard: Arc::clone(&model_guard),
        abort_flag: Arc::clone(&abort_flag),
        token_sender,
        completion_request: payload.0,
    }) {
        Some(thread) => thread,
        None => {
            println!("Failed to spawn inference thread.");
            return HttpResponse::InternalServerError().finish();
        }
    };

    let stream = AbortStream::new(receiver, Arc::clone(&abort_flag), inference_thread);

    HttpResponse::Ok()
        .append_header(("Content-Type", "text/event-stream"))
        .append_header(("Cache-Control", "no-cache"))
        // .keep_alive()
        .streaming(stream)
}

#[tauri::command]
pub async fn start_server<'a>(
    state: tauri::State<'a, InferenceServerState>,
    port: u16,
) -> Result<(), String> {
    if state.running.load(Ordering::SeqCst) {
        return Err("Server is already running.".to_string());
    }

    state.running.store(true, Ordering::SeqCst);

    let server_clone = Arc::clone(&state.server);

    tauri::async_runtime::spawn(async move {
        let server = HttpServer::new(|| {
            App::new()
                .service(ping)
                .service(post_model)
                .service(post_completions)
        })
        .bind(("127.0.0.1", port))
        .unwrap()
        // .disable_signals()
        .run();
        *server_clone.lock() = Some(server.handle());
        println!("Server started on port {port}");
        server.await.unwrap();
    });

    Ok(())
}

#[tauri::command]
pub async fn stop_server<'a>(state: tauri::State<'a, InferenceServerState>) -> Result<(), String> {
    println!("Stopping server on port");

    if !state.running.load(Ordering::SeqCst) {
        return Err("Server is not running.".to_string());
    }

    let server_stop = {
        let mut server_opt = state.server.lock();
        if let Some(server) = server_opt.take() {
            state.running.store(false, Ordering::SeqCst);
            Some(server.stop(true))
        } else {
            None
        }
    };

    if let Some(server_stop) = server_stop {
        server_stop.await;
    } else {
        return Err("Server is not running.".to_string());
    }

    Ok(())
}

#[tauri::command]
pub async fn load_model<'a>(
    app_handle: AppHandle,
    path: &str,
    model_type: &str,
    concurrency: usize,
) -> Result<(), String> {
    let cache_dir = get_app_dir_path_buf(&app_handle, String::from("inference_cache"))
        .await
        .unwrap();

    spawn_pool(path, model_type, concurrency, &cache_dir).await
}
