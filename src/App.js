import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

const API_KEY = '8317ec0df5c5ee0a6089689060a98e03';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w342';
const DISCOVER_URL = `${BASE_URL}/discover/movie`;
const SEARCH_URL   = `${BASE_URL}/search/movie`;

const cmpDateDesc = (a,b) => ((b||'') === (a||'')) ? 0 : ((b||'') > (a||'') ? 1 : -1);
const cmpDateAsc  = (a,b) => ((a||'') === (b||'')) ? 0 : ((a||'') > (b||'') ? 1 : -1);
const num = v => (typeof v === 'number' && !Number.isNaN(v)) ? v : -Infinity;

function clientSort(results, sortBy) {
  if (sortBy === 'none') return results || [];
  const arr = [...(results || [])];
  switch (sortBy) {
    case 'release_date.desc': arr.sort((x,y)=>cmpDateDesc(x.release_date, y.release_date)); break;
    case 'release_date.asc':  arr.sort((x,y)=>cmpDateAsc (x.release_date, y.release_date)); break;
    case 'vote_average.desc': arr.sort((x,y)=>num(y.vote_average) - num(x.vote_average));  break;
    case 'vote_average.asc':  arr.sort((x,y)=>num(x.vote_average) - num(y.vote_average));  break;
  }
  return arr;
}

export default function App() {
  const [mode, setMode] = useState('discover'); 
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('none');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [results, setResults] = useState([]);
  const debounceRef = useRef(null);

  const requestCap = useMemo(() => Math.min(totalPages, 500), [totalPages]);

  const buildUrl = () => {
    const base = mode === 'discover' ? DISCOVER_URL : SEARCH_URL;
    const u = new URL(base);
    u.searchParams.set('include_adult', 'false');
    u.searchParams.set('language', 'en-US');
    u.searchParams.set('page', String(page));
    if (mode === 'discover') {
      u.searchParams.set('include_video', 'false');
      u.searchParams.set('sort_by', sortBy === 'none' ? 'popularity.desc' : sortBy);
    } else {
      u.searchParams.set('query', query);
    }
    u.searchParams.set('api_key', API_KEY);
    return u.toString();
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErr('');
      try {
        const res = await fetch(buildUrl());
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setTotalPages(data.total_pages || 1);
        const list = mode === 'search'
          ? clientSort(data.results || [], sortBy)
          : (data.results || []);
        setResults(list);
      } catch (e) {
        if (!cancelled) setErr(e.message || 'Failed to load movies.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [mode, query, page, sortBy]);

  const onSearchChange = (e) => {
    const val = e.target.value;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const q = val.trim();
      setQuery(q);
      setMode(q ? 'search' : 'discover');
      setPage(1);
    }, 350);
  };

  const onSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      clearTimeout(debounceRef.current);
      const q = e.currentTarget.value.trim();
      setQuery(q);
      setMode(q ? 'search' : 'discover');
      setPage(1);
    }
  };

  const onSortChange = (e) => {
    const v = e.target.value || 'none';
    setSortBy(v);
    if (v === 'none') {
      setMode('discover');
      setQuery('');
    }
    setPage(1);
  };

return (
  <div className="app-container">
    <header>
      <h1>Movie Explorer</h1>
    </header>

    <section id="search-section">
      <input
        id="search-input"
        placeholder="Search for a movie…"
        defaultValue={query}
        onInput={onSearchChange}
        onKeyDown={onSearchKeyDown}
      />
      <select id="sort-select" value={sortBy} onChange={onSortChange}>
        <option value="none">Sort By</option>
        <option value="release_date.asc">Release Date (Asc)</option>
        <option value="release_date.desc">Release Date (Desc)</option>
        <option value="vote_average.asc">Rating (Asc)</option>
        <option value="vote_average.desc">Rating (Desc)</option>
      </select>
    </section>

    <main id="main">
      {loading && <p>Loading…</p>}
      {err && <p style={{ color: '#c00' }}>{err}</p>}
      {!loading && !err && results.length === 0 && <p>No results.</p>}

      {results.map((m) => (
        <article className="movie" key={m.id}>
          {m.poster_path ? (
            <div className="poster-wrap">
              <img
                className="poster"
                src={`${IMAGE_URL}${m.poster_path}`}
                alt={m.title || 'Movie poster'}
              />
            </div>
          ) : (
            <div className="poster-wrap">
              <img
                className="poster"
                src="/no-img.png"            
                alt="No poster available"
              />  
            </div>
          )}
          <div className="movie-info">
            <h3>{m.title || 'Untitled'}</h3>
            <p>Release: {m.release_date || '—'}</p>
            <p>Rating: {typeof m.vote_average === 'number' ? m.vote_average.toFixed(1) : '—'}</p>
          </div>
        </article>
      ))}
    </main>

    <footer id="pager">
      <button id="prevBtn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
        Prev
      </button>
      <span id="pageInfo">Page {page} - {totalPages}</span>
      <button id="nextBtn" onClick={() => setPage((p) => Math.min(requestCap, p + 1))} disabled={page >= requestCap}>
        Next
      </button>
    </footer>
  </div>
);
}
