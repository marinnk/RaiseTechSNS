import { useEffect, useState } from 'react';
import { apiGet } from './api/client';
import './App.css';

type HealthResponse = { status: string };

function App() {
  const [apiStatus, setApiStatus] = useState<'checking' | 'ok' | 'error'>('checking');

  useEffect(() => {
    apiGet<HealthResponse>('/api/health')
      .then((res) => setApiStatus(res.status === 'ok' ? 'ok' : 'error'))
      .catch(() => setApiStatus('error'));
  }, []);

  return (
    <main>
      <h1>RaiseTechSNS</h1>
      <p>
        バックエンドAPI:{' '}
        {apiStatus === 'checking' && '接続確認中…'}
        {apiStatus === 'ok' && '接続OK'}
        {apiStatus === 'error' && '接続エラー'}
      </p>
    </main>
  );
}

export default App;
