# Debugging Integrations

## Visual Studio Code

The project build setup is friendly to VS Code. Create the following
`.vscode/launch.json` configuration, based on instructions for setting up
[TypeScript debugging in VS Code][1] and a Microsoft VS Code [recipe for
debugging Jest tests][2].

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Execute Integration Local",
      "program": "${workspaceFolder}/tools/execute.ts",
      "runtimeArgs": ["-r", "dotenv/config"],
      "preLaunchTask": "tsc: build - tsconfig.json",
      "sourceMaps": true,
      "outFiles": ["${workspaceFolder}/build/**/*.js"]
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Jest All",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "disableOptimisticBPs": true,
      "windows": {
        "program": "${workspaceFolder}/node_modules/jest/bin/jest"
      }
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Jest Current File",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": [
        "${fileBasenameNoExtension}",
        "--config",
        "jest.config.js",
        "--no-coverage"
      ],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "disableOptimisticBPs": true,
      "windows": {
        "program": "${workspaceFolder}/node_modules/jest/bin/jest"
      }
    }
  ]
}
```

[1]: https://code.visualstudio.com/docs/typescript/typescript-debugging
[2]:
  https://github.com/Microsoft/vscode-recipes/tree/master/debugging-jest-tests
