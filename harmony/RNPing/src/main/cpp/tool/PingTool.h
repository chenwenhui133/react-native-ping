/*
 * Copyright (c) Huawei Technologies Co., Ltd. 2025-2025. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

#ifndef PINGTOOL_PINGTOOL_H
#define PINGTOOL_PINGTOOL_H

#include <js_native_api_types.h>
#include <string>
#include "hilog/log.h"
// 引用网络连接模块头文件
#include "network/netmanager/net_connection.h"
#include <sstream>

class PingTool {
public:
    static char *Ping(char address[], int32_t duration);
};

#endif // PINGTOOL_PINGTOOL_H
