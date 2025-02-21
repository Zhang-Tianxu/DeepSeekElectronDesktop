[Setup]
AppName=DeepSeekDesktop
AppVersion=1.0
DefaultDirName={pf}\MyApp
OutputDir=.\Output
OutputBaseFilename=MyApp_Setup
DiskSpanning=yes
Compression=lzma2/max

[Files]
Source: "electron-builder-output\win-ia32-unpacked\*"; DestDir: "{app}"; Flags: recursesubdirs