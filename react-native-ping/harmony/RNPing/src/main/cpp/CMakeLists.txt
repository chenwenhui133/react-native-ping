# the minimum version of CMake.
cmake_minimum_required(VERSION 3.13)
set(CMAKE_VERBOSE_MAKEFILE on)
set(NATIVERENDER_ROOT_PATH ${CMAKE_CURRENT_SOURCE_DIR})

set(rnoh_ping_generated_dir "${CMAKE_CURRENT_SOURCE_DIR}/generated")

include_directories(${NATIVERENDER_ROOT_PATH}
                    ${NATIVERENDER_ROOT_PATH}/include
                    ${NATIVERENDER_ROOT_PATH}/tool)

set(BASE_LIBRARY
    libace_napi.z.so libnet_connection.so libhilog_ndk.z.so)

file(GLOB_RECURSE rnoh_ping_generated_SRC "${rnoh_ping_generated_dir}/**/*.cpp")
file(GLOB rnoh_ping_SRC CONFIGURE_DEPENDS *.cpp)
file(GLOB rnoh_ping_TOOL_SRC CONFIGURE_DEPENDS tool/*.cpp)

add_library(rnoh_ping SHARED ${rnoh_ping_SRC} ${rnoh_ping_generated_SRC} ${rnoh_ping_TOOL_SRC})
target_include_directories(rnoh_ping PUBLIC ${CMAKE_CURRENT_SOURCE_DIR} ${rnoh_ping_generated_dir})
target_link_libraries(rnoh_ping PUBLIC rnoh)
target_link_libraries(rnoh_ping PUBLIC ${BASE_LIBRARY})

add_library(entry SHARED napi_init.cpp tool/PingTool.cpp)
target_include_directories(entry PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/tool)
target_link_libraries(entry PUBLIC ${BASE_LIBRARY})