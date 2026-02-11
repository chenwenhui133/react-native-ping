project(rnapp)
cmake_minimum_required(VERSION 3.4.1)
set(CMAKE_SKIP_BUILD_RPATH TRUE)
set(RNOH_APP_DIR "${CMAKE_CURRENT_SOURCE_DIR}")
set(NODE_MODULES "${CMAKE_CURRENT_SOURCE_DIR}/../../../../../node_modules")
set(OH_MODULE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../../oh_modules")
set(RNOH_CPP_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../../oh_modules/@rnoh/react-native-openharmony/src/main/cpp")
set(RNOH_GENERATED_DIR "${CMAKE_CURRENT_SOURCE_DIR}/generated")
set(LOG_VERBOSITY_LEVEL 1)
set(CMAKE_ASM_FLAGS "-Wno-error=unused-command-line-argument -Qunused-arguments")
set(CMAKE_CXX_FLAGS "-fstack-protector-strong -Wl,-z,relro,-z,now,-z,noexecstack -s -fPIE -pie")
set(OH_MODULES "${CMAKE_CURRENT_SOURCE_DIR}/../../../oh_modules")

set(WITH_HITRACE_SYSTRACE 1) # for other CMakeLists.txt files to use
add_compile_definitions(WITH_HITRACE_SYSTRACE)

add_subdirectory("${RNOH_CPP_DIR}" ./rn)

# RNOH_BEGIN: manual_package_linking_1
#add_subdirectory("${OH_MODULES}/@react-native-ohos/push-notification-ios/src/main/cpp" ./push_notification)
#add_subdirectory("${OH_MODULES}/@react-native-oh-tpl/react-native-gesture-handler/src/main/cpp" ./gesture-handler)
#add_subdirectory("${OH_MODULES}/@react-native-oh-tpl/react-native-safe-area-context/src/main/cpp" ./safe-area)
#add_subdirectory("${OH_MODULES}/@react-native-oh-tpl/react-native-video/src/main/cpp" ./video)
#add_subdirectory("${OH_MODULES}/@react-native-oh-tpl/react-native-fast-image/src/main/cpp" ./fast-image)
#add_subdirectory("${OH_MODULES}/@react-native-ohos/react-native-ping/src/main/cpp" ./ping)
# RNOH_END: manual_package_linking_1

file(GLOB GENERATED_CPP_FILES "${CMAKE_CURRENT_SOURCE_DIR}/generated/*.cpp") # this line is needed by codegen v1

add_library(rnoh_app SHARED
    ${GENERATED_CPP_FILES}
    "./PackageProvider.cpp"
    "${RNOH_CPP_DIR}/RNOHAppNapiBridge.cpp"
)
target_link_libraries(rnoh_app PUBLIC rnoh)

# RNOH_BEGIN: manual_package_linking_2
#target_link_libraries(rnoh_app PUBLIC rnoh_push_notification)
#target_link_libraries(rnoh_app PUBLIC rnoh_gesture_handler)
#target_link_libraries(rnoh_app PUBLIC rnoh_safe_area)
#target_link_libraries(rnoh_app PUBLIC rnoh_video)
#target_link_libraries(rnoh_app PUBLIC rnoh_fast_image)
#target_link_libraries(rnoh_app PUBLIC rnoh_ping)
# RNOH_END: manual_package_linking_2
