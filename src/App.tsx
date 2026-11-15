import { About } from './components/About.tsx'
import { Jukebox } from './components/Jukebox.tsx'
import { tracks } from './tracks/index.ts'

function App() {
  return (
    <main>
      <h1>Earth Jukebox</h1>
      <p>
        Pick a visualization of our planet and hear it. The soundscape is made live in your browser
        from the picture itself, so the changing Earth can be listened to as well as seen.
      </p>
      <Jukebox tracks={tracks} />
      <About />
    </main>
  )
}

export default App
