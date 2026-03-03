/*
 * Copyright (c) Huawei Technologies Co., Ltd. 2025-2025. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an ""AS IS"" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

#include "napi/native_api.h"
#include "tool/PingTool.h"
#include <cstdint>

#define LOG_DOMAIN 0xFF00
#define LOG_TAG "NativePing"

struct CallbackData {
    napi_async_work asyncWork = nullptr;
    napi_deferred deferred = nullptr;
    napi_ref callback = nullptr;
    char *argAddress = nullptr;
    int32_t argDuration = 3;
    char* result = nullptr;
};

static void ReleaseCallbackData(CallbackData* callbackData) 
{
    delete[] callbackData->argAddress;
    callbackData->deferred = nullptr;
    callbackData->callback = nullptr;
    callbackData->asyncWork = nullptr;
    if (callbackData->result != nullptr) {
        delete[] callbackData->result;
    }
    delete callbackData;
    callbackData = nullptr;
}

/**
 * 异步任务执行回调
 * @param env
 * @param data
 */
static void PingExecuteCB(napi_env env, void *data) 
{
    CallbackData *callbackData = reinterpret_cast<CallbackData *>(data);
    
    char *pingMessage;
    pingMessage = PingTool::Ping(callbackData->argAddress, callbackData->argDuration);
    callbackData->result = pingMessage;
}

/**
 * 异步任务执行完成回调
 * @param env
 * @param status
 * @param data
 */
static void PingCompleteCB(napi_env env, napi_status status, void *data) 
{
    CallbackData *callbackData = reinterpret_cast<CallbackData *>(data);
    
    napi_status createResStatus;
    napi_value result = nullptr;
    createResStatus = napi_create_string_utf8(env, callbackData->result, NAPI_AUTO_LENGTH, &result);
    
    if (createResStatus != napi_ok) {
        OH_LOG_Print(LOG_APP, LOG_ERROR, LOG_DOMAIN, LOG_TAG, "create async work result value error");
        napi_create_string_utf8(env, "failed: no result", NAPI_AUTO_LENGTH, &result);
        napi_reject_deferred(env, callbackData->deferred, result);
    } else {
        if (callbackData->result == nullptr) {
            napi_reject_deferred(env, callbackData->deferred, result);
        } else {
            napi_resolve_deferred(env, callbackData->deferred, result);
        }
    }
    
    napi_delete_async_work(env, callbackData->asyncWork);
    ReleaseCallbackData(callbackData);
    
    callbackData = nullptr;
}

static napi_value NativePing(napi_env env, napi_callback_info info) 
{
    size_t argc = 2;
    napi_value args[2] = {nullptr};

    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    if (argc < 2) {
        napi_throw_error(env, nullptr, "Invalid arguments count");
        return nullptr;
    }

    napi_valuetype argType0;
    napi_typeof(env, args[0], &argType0);

    if (argType0 != napi_string) {
        napi_throw_type_error(env, nullptr, "First argument should be string type");
        return nullptr;
    }

    napi_valuetype argType1;
    napi_typeof(env, args[1], &argType1);

    if (argType1 != napi_number) {
        napi_throw_type_error(env, nullptr, "Second argument should be number type");
        return nullptr;
    }

    // 读取要Ping的地址
    napi_status lenStatus;
    size_t strLen = 0;
    lenStatus = napi_get_value_string_utf8(env, args[0], nullptr, 0, &strLen);
    if (lenStatus != napi_ok) {
        napi_throw_error(env, nullptr, "get address len error");
        return nullptr;
    }

    napi_status readStatus;
    char *buffer = new char[strLen + 1];
    size_t realLen;
    readStatus = napi_get_value_string_utf8(env, args[0], buffer, strLen + 1, &realLen);
    if (readStatus != napi_ok) {
        napi_throw_error(env, nullptr, "read address data error");
        delete[] buffer;
        return nullptr;
    }

    // 读取探测的持续时间
    napi_status durationStatus;
    int32_t duration;
    durationStatus = napi_get_value_int32(env, args[1], &duration);
    if (durationStatus != napi_ok) {
        napi_throw_error(env, nullptr, "read duration data error");
        return nullptr;
    }

    // 创建异步任务，执行ping操作
    napi_status createPromiseStatus;
    napi_value promiseValue = nullptr;
    napi_deferred deferred = nullptr;
    createPromiseStatus = napi_create_promise(env, &deferred, &promiseValue);

    if (createPromiseStatus != napi_ok) {
        napi_throw_error(env, nullptr, "create promise object error");
        return nullptr;
    }

    auto callbackData = new CallbackData();
    callbackData->deferred = deferred;
    callbackData->argAddress = buffer;
    callbackData->argDuration = duration;

    napi_status createResourceStatus;
    napi_value resourceName = nullptr;
    createResourceStatus = napi_create_string_utf8(env, "PingAsyncCallback", NAPI_AUTO_LENGTH, &resourceName);

    if (createResourceStatus != napi_ok) {
        ReleaseCallbackData(callbackData);
        napi_throw_error(env, nullptr, "create resource name error");
        return nullptr;
    }

    napi_status createAsyncStatus;
    createAsyncStatus = napi_create_async_work(env, nullptr, resourceName, PingExecuteCB, PingCompleteCB, callbackData,
                                               &callbackData->asyncWork);
    if (createAsyncStatus != napi_ok) {
        ReleaseCallbackData(callbackData);
        napi_throw_error(env, nullptr, "create async work error");
        return nullptr;
    }
    
    if (napi_queue_async_work(env, callbackData->asyncWork) != napi_ok) {
        ReleaseCallbackData(callbackData);
        napi_delete_async_work(env, callbackData->asyncWork);
        napi_throw_error(env, nullptr, "enqueue async work error");
        return nullptr;
    }

    return promiseValue;
}
EXTERN_C_START
static napi_value Init(napi_env env, napi_value exports) 
{
    napi_property_descriptor desc[] = {
        {"nativePing", nullptr, NativePing, nullptr, nullptr, nullptr, napi_default, nullptr}};
    napi_define_properties(env, exports, sizeof(desc) / sizeof(desc[0]), desc);
    return exports;
}
EXTERN_C_END

static napi_module demoModule = {
    .nm_version = 1,
    .nm_flags = 0,
    .nm_filename = nullptr,
    .nm_register_func = Init,
    .nm_modname = "entry",
    .nm_priv = ((void *)0),
    .reserved = {0},
};

extern "C" __attribute__((constructor)) void RegisterEntryModule(void) { napi_module_register(&demoModule); }
