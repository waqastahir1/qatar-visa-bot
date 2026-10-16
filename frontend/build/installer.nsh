; Custom NSIS script
; customInit runs first — before NSIS checks for running processes

!macro customInit
  ; Force-close Qatar Visa Bot before the installer does anything
  nsExec::ExecToLog 'cmd /c taskkill /F /IM "Qatar Visa Bot.exe" /T 2>nul'
  Sleep 2000
!macroend

!macro customUnInstall
  ; Force-close before uninstalling too
  nsExec::ExecToLog 'cmd /c taskkill /F /IM "Qatar Visa Bot.exe" /T 2>nul'
  Sleep 1000
!macroend
