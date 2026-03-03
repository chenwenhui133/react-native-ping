/*
 * Copyright (c) Huawei Technologies Co., Ltd. 2025-2025. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

#include "PingTool.h"
#define LOG_DOMAIN 0xFF00
#define LOG_TAG "NativePing"

char* PingTool::Ping(char address[], int32_t duration)
{
    NetConn_ProbeResultInfo probeInfo;
    probeInfo.lossRate = 0;
    probeInfo.rtt[0] = 0;
    probeInfo.rtt[1] = 0;
    probeInfo.rtt[2] = 0;
    probeInfo.rtt[3] = 0;

    int32_t ret = OH_NetConn_QueryProbeResult(address, duration, &probeInfo);

    // ret!=0时代表调用出错
    if (ret != 0) {
        OH_LOG_ERROR(LOG_APP, "query probe info error: ret = %{public}d", ret);
        return nullptr;
    }
    // 成功调用后，获取返回结果中的丢包率，最小、最大、平均以及标准时延
    uint8_t lossRate = probeInfo.lossRate;
    uint32_t minDelay = probeInfo.rtt[0];
    uint32_t maxDelay = probeInfo.rtt[1];
    uint32_t avgDelay = probeInfo.rtt[2];
    uint32_t stdDelay = probeInfo.rtt[3];
    char *json = nullptr;
    try {
        std::ostringstream oss;
        oss << "{\"lossRate\": " << static_cast<int>(lossRate) << ", \"minDelay\": " << minDelay
            << ", \"maxDelay\": " << maxDelay << ", \"avgDelay\": " << avgDelay << ", \"stdDelay\": " << stdDelay
            << "}";
        std::string str = oss.str();
        json = new char[str.size() + 1];
        str.copy(json, str.size(), 0);
        json[str.size()] = '\0';
    } catch (const std::bad_alloc& e) {
        OH_LOG_Print(LOG_APP, LOG_ERROR, LOG_DOMAIN, LOG_TAG, "build json result error: %{public}s", e.what());
    }
    OH_LOG_Print(LOG_APP, LOG_INFO, LOG_DOMAIN, LOG_TAG, 
                 "query probe info: %{public}s", json == nullptr ? "nullptr" : json);
    return json;
}