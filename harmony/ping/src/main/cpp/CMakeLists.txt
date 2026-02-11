# the minimum version of CMake.
cmake_minimum_required(VERSION 3.13)
set(CMAKE_VERBOSE_MAKEFILE on)

set(rnoh_ping_generated_dir "${CMAKE_CURRENT_SOURCE_DIR}/generated")
file(GLOB_RECURSE rnoh_ping_generated_SRC "${rnoh_ping_generated_dir}/**/*.cpp")
file(GLOB rnoh_ping_SRC CONFIGURE_DEPENDS *.cpp)
add_library(rnoh_ping SHARED ${rnoh_ping_SRC} ${rnoh_ping_generated_SRC})
target_include_directories(rnoh_ping PUBLIC ${CMAKE_CURRENT_SOURCE_DIR} ${rnoh_ping_generated_dir})
target_link_libraries(rnoh_ping PUBLIC rnoh)