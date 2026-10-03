import { useEffect, useState } from 'react'
import { useApp } from './store'

function useSystemDark(): boolean {
  const [dark, setDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches)
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const h = (): void => setDark(mq.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  return dark
}

export function useIsDark(): boolean {
  const theme = useApp((s) => s.settings.theme)
  const sys = useSystemDark()
  return theme === 'dark' || (theme === 'system' && sys)
}
