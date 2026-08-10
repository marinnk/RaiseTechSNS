import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import App from './App';

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok' }),
      }),
    );
  });

  it('タイトルを表示する', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'RaiseTechSNS' })).toBeInTheDocument();
  });

  it('ヘルスチェックAPIの結果を表示する', async () => {
    render(<App />);
    expect(await screen.findByText(/接続OK/)).toBeInTheDocument();
  });
});
