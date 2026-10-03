import { createRoot } from 'react-dom/client'
import './styles.css'
import './lib/monaco'
import { App } from './App'

createRoot(document.getElementById('root')!).render(<App />)
