{
  "targets": [
    {
      "target_name": "ios_screen_capture",
      "sources": [
        "src/native/ios-screen-capture.cpp"
      ],
      "include_dirs": [
        "<!@node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "cflags!": ["-fno-exceptions"],
      "cflags_cc!": ["-fno-exceptions"],
      "conditions": [
        ["OS=='win'", {
          "libraries": [
            "resources/bin/win/libimobiledevice.lib",
            "resources/bin/win/plist.lib",
            "resources/bin/win/libusbmuxd.lib"
          ],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1,
              "AdditionalOptions": ["/std:c++17"]
            }
          }
        }],
        ["OS=='mac'", {
          "libraries": [
            "resources/bin/mac/libimobiledevice.dylib",
            "resources/bin/mac/libplist.dylib",
            "resources/bin/mac/libusbmuxd.dylib"
          ],
          "xcode_settings": {
            "CLANG_CXX_LANGUAGE_STANDARD": "c++17",
            "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
            "MACOSX_DEPLOYMENT_TARGET": "10.15",
            "OTHER_LDFLAGS": [
              "-framework", "CoreFoundation",
              "-framework", "Security"
            ]
          }
        }]
      ]
    }
  ]
}
