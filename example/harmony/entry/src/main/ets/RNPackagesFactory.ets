/*
 * Copyright (c) 2024 Huawei Device Co., Ltd. All rights reserved
 * Use of this source code is governed by a MIT license that can be
 * found in the LICENSE file.
 */


import type {RNPackageContext, RNPackage} from '@rnoh/react-native-openharmony/ts';
// import { PushNotificationPackage } from '@react-native-ohos/push-notification-ios/ts';
// import { GestureHandlerPackage } from '@react-native-oh-tpl/react-native-gesture-handler/ts'
// import {SafeAreaViewPackage} from '@react-native-oh-tpl/react-native-safe-area-context/ts'
// import { RNCVideoPackage } from '@react-native-oh-tpl/react-native-video/ts';
// import {FastImagePackage} from '@react-native-oh-tpl/react-native-fast-image/ts';
// import {RNReactNativePingPackage} from '@react-native-ohos/react-native-ping/ts';

export function createRNPackages(ctx: RNPackageContext): RNPackage[] {
  return [
    // new PushNotificationPackage(ctx),
    // new GestureHandlerPackage(ctx),
    // new SafeAreaViewPackage(ctx),
    // new RNCVideoPackage(ctx),
    // new FastImagePackage(ctx),
    // new RNReactNativePingPackage(ctx),
  ];
}
