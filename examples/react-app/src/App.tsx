import './App.css'

import { useMintlayer } from '@mintlayer/react';

function App() {
  const { client, loading, error, connect, disconnect, setNetwork, connected } = useMintlayer();

  return (
    <>

      <h2>Mintlayer React Example</h2>

      <div>
        {connected ? (
          <button onClick={disconnect}>Disconnect</button>
        ) : (
          <button onClick={connect} disabled={loading}>
            Connect
          </button>
        )}
      </div>
    </>
  )
}

export default App
