import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import "./App.css";

// Full App.tsx — UUID-based autosave (Option C)
export default function App() {
  // App state
  const [songs, setSongs] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [selections, setSelections] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(100);

  // audio
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<number | string | null>(null);

  // quotes (same as you had)
  const quotes = [
    { text: "“That's our handoek”", author: "Thijs 2016", image: "https://i.imgur.com/1OM5FNn.jpeg" },
    { text: "“Ik was net bezig met likken”", author: "Haverkort 2016", image: "https://i.imgur.com/5MyVsxw.png" },
    { text: "“Ik steel geen schoenen, ik steel alleen maar harten”", author: "Dana 2025", image: "https://i.imgur.com/QUCMFoY.png" },
    { text: "“Je wordt hier gewoon progressief in je kontje geneukt”", author: "Hamel 2025", image: "https://i.imgur.com/8Iyhf3W.jpeg" },
    { text: "“Ja ik kan ècht wel alleen naar huis fietsen”", author: "Leon 2015", image: "https://i.imgur.com/AkAcFQx.jpeg" },
    { text: "“Ik neuk vloeiend Duits”", author: "Tim 2016", image: "https://i.imgur.com/76kTeQ5.jpeg" },
    { text: "“Als de zon vijf duimen boven de vlierbes uitkomt en de haan hinnikt dan is de tijd gekomen om ginder te gaan”", author: "Danny 2015", image: "https://i.imgur.com/rcc5L90.png" },
    { text: "“Ik ben ook een warmbloedig animaal”", author: "Pola 2025", image: "https://i.imgur.com/qklRtnr.png" },
    { text: "“Ik heb helemaal geen tv, ik heb er wel twee”", author: "Carsten 2014", image: "https://i.imgur.com/jnBr00W.png" },
    { text: "“Er zit echt wel ketsbaar materiaal bij”", author: "Timo 2025", image: "https://i.imgur.com/O6qTQ5l.jpeg" },
  ];
  const [quote, setQuote] = useState(quotes[0]);
  useEffect(() => {
    const idx = new Date().getDate() % quotes.length;
    setQuote(quotes[idx]);
  }, []);

  // popups
  const [showPopup, setShowPopup] = useState(false);
  const [showShop, setShowShop] = useState(false);

  async function logPopupClick() {
    try {
      await supabase.from("popup_clicks").insert([{ name: name || "Onbekend" }]);
    } catch (e) {
      console.warn("logPopupClick", e);
    }
  }

  function openPopup() {
    setShowPopup(true);
    logPopupClick();
  }
  function closePopup() {
    setShowPopup(false);
  }
  function openShop() {
    setShowShop(true);
  }
  function closeShop() {
    setShowShop(false);
  }

  // --------------------
  // UUID autosave setup
  // --------------------
  // We store a persistent UUID for this browser in localStorage under key 'gs_uuid'.
  // All saved state for this session is stored under 'gs_state_<uuid>' as JSON:
  // { name, limit, ids: [id,...] }

  const [uuid, setUuid] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<(string | number)[]>([]); // ids loaded from localStorage before songs are ready

  function makeUuid(): string {
    // use crypto.randomUUID() if available
    if (typeof (window as any).crypto?.randomUUID === "function") {
      return (window as any).crypto.randomUUID();
    }
    // fallback simple UUID v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // init uuid and load saved state for that uuid
  useEffect(() => {
    let id = localStorage.getItem("gs_uuid");
    if (!id) {
      id = makeUuid();
      localStorage.setItem("gs_uuid", id);
    }
    setUuid(id);

    // load state for uuid (if any)
    try {
      const raw = localStorage.getItem(`gs_state_${id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed) {
          if (parsed.name) setName(parsed.name);
          if (parsed.limit) setLimit(Number(parsed.limit) || 100);
          if (Array.isArray(parsed.ids)) setPendingIds(parsed.ids);
        }
      }
    } catch (e) {
      console.warn("failed parse saved state", e);
    }
  }, []);

  // helper to persist current state for uuid
  useEffect(() => {
    if (!uuid) return;
    const state = {
      name,
      limit,
      ids: selections.map((s) => s.id),
    };
    try {
      localStorage.setItem(`gs_state_${uuid}`, JSON.stringify(state));
    } catch (e) {}
  }, [name, limit, selections, uuid]);

  // --------------------
  // Songs fetch + mapping pending ids
  // --------------------
  useEffect(() => {
    async function fetchSongs() {
      const { data, error } = await supabase
        .from("songs")
        .select("id,title,artist,image_url,preview_url")
        .order("title", { ascending: true });

      if (error) {
        console.error("Supabase error:", error);
        setSongs([]);
        setFiltered([]);
      } else {
        setSongs(data || []);
        setFiltered(data || []);
      }
    }
    fetchSongs();
  }, []);

  // once songs are loaded, map pendingIds -> selection objects
  useEffect(() => {
    if (!songs || songs.length === 0) return;
    if (!pendingIds || pendingIds.length === 0) return;

    // create map by stringified id
    const map = new Map<string, any>();
    songs.forEach((s) => map.set(String(s.id), s));

    const mapped: any[] = [];
    for (const id of pendingIds) {
      const key = String(id);
      if (map.has(key)) mapped.push(map.get(key));
      else console.warn("saved id not found in songs:", id);
    }

    if (mapped.length > 0) setSelections(mapped);
    setPendingIds([]);
  }, [songs, pendingIds]);

  // --------------------
  // filtering
  // --------------------
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) setFiltered(songs);
    else
      setFiltered(
        songs.filter(
          (s) => (s.title && s.title.toLowerCase().includes(q)) || (s.artist && s.artist.toLowerCase().includes(q))
        )
      );
  }, [query, songs]);

  // --------------------
  // audio playback helpers
  // --------------------
  function togglePreview(song: any) {
    if (!song.preview_url) return;

    // if same song playing -> stop
    if (playingId === song.id) {
      currentAudio?.pause();
      if (currentAudio) currentAudio.currentTime = 0;
      setPlayingId(null);
      setCurrentAudio(null);
      return;
    }

    // stop existing
    if (currentAudio) {
      currentAudio.pause();
      try {
        currentAudio.currentTime = 0;
      } catch {}
    }

    const audio = new Audio(song.preview_url);
    audio.onended = () => {
      setPlayingId(null);
      setCurrentAudio(null);
    };
    audio.onpause = () => {
      // if paused manually
      if (!audio.ended) {
        setPlayingId(null);
        setCurrentAudio(null);
      }
    };

    audio.play().then(() => {
      setPlayingId(song.id);
      setCurrentAudio(audio);
    }).catch((e) => console.warn("audio play", e));
  }

  // --------------------
  // selection logic
  // --------------------
  function addSong(song: any) {
    if (selections.some((s) => s.id === song.id)) return;
    if (selections.length >= limit) {
      alert(`Je mag maximaal ${limit} nummers kiezen.`);
      return;
    }
    setSelections((prev) => [...prev, song]);
  }

  function removeAt(idx: number) {
    setSelections((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleDragEnd(result: any) {
    if (!result.destination) return;
    const items = Array.from(selections);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setSelections(items);
  }

  // --------------------
  // submit
  // --------------------
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      alert("Vul je naam in vóór het stemmen.");
      return;
    }
    if (selections.length === 0) {
      alert("Kies minimaal één nummer voordat je stemt.");
      return;
    }

    const formatted = selections.map((song, i) => ({ rank: i + 1, title: song.title, artist: song.artist, id: song.id }));

    const { error } = await supabase.from("votes").insert([ { name, email, selections: formatted } ]);
    if (error) {
      alert("Er ging iets mis: " + error.message);
    } else {
      // clear saved state for this uuid
      if (uuid) {
        try { localStorage.removeItem(`gs_state_${uuid}`); } catch {}
      }
      setSubmitted(true);
    }
  }

  // --------------------
  // Render
  // --------------------
  if (submitted) {
    return (
      <div className="container">
        <div className="thankyou">
          <h2>Bedankt voor je stem, {name}! 💚</h2>
          <p>Je stem is opgeslagen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header>
        <h1>🐱 Geef Slaaj Top 100 🐱</h1>
        <div className="controls">
          <input type="text" placeholder="Naam" value={name} onChange={(e) => setName(e.target.value)} />
          <label className="limit">Max keuze:
            <select value={limit} onChange={(e) => { const v = Number(e.target.value); setLimit(v); if (selections.length > v) setSelections(selections.slice(0, v)); }}>
              <option value={30}>30</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
        </div>
      </header>

      <div className="banner-layout">
        <div className="side-banner left-banner">
          <div className="ad-content quote-banner">
            <div className="dancing-slaaj">🥬</div>
            <h3>💬 Quote van de dag</h3>
            <img src={quote.image} alt={quote.author} className="quote-img" />
            <p className="quote-text">{quote.text}</p>
            <p className="quote-author">– {quote.author}</p>
            <button className="popup-btn" onClick={openPopup}>❓</button>
          </div>
        </div>

        <main className="layout">
          <section className="left">
            <div className="searchbar">
              <input type="text" placeholder="Zoek op titel of artiest..." value={query} onChange={(e) => setQuery(e.target.value)} />
              <div className="resultcount">{filtered.length} nummers</div>
            </div>

            <div className="songlist" role="list">
              {filtered.map((song) => {
                const isSel = selections.some((s) => s.id === song.id);
                return (
                  <div key={song.id} className="song-card">
                    <img src={song.image_url || "https://via.placeholder.com/300x300?text=Geen+afbeelding"} alt={song.title} className={`cover ${playingId === song.id ? "playing" : ""}`} />
                    <div className="info">
                      <div className="title">{song.title}</div>
                      <div className="artist">{song.artist}</div>
                      {song.preview_url && (
                        <div className="preview-control">
                          <button onClick={(e) => { e.stopPropagation(); togglePreview(song); }} className={`play-btn ${playingId === song.id ? "playing" : ""}`} aria-pressed={playingId === song.id}>{playingId === song.id ? "⏸️ Pauzeer" : "▶️ Preview"}</button>
                        </div>
                      )}
                    </div>
                    <button onClick={() => addSong(song)} disabled={isSel} className={isSel ? "btn disabled" : "btn"}>{isSel ? "✓ Geselecteerd" : "Selecteer"}</button>
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="right">
            <h2>Jouw Toplijst ({selections.length}/{limit})</h2>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="toplist">
                {(provided) => (
                  <div className="selectedlist" {...provided.droppableProps} ref={provided.innerRef}>
                    {selections.length === 0 && (<div className="empty">Nog geen nummers gekozen</div>)}
                    {selections.map((s, idx) => (
                      <Draggable key={s.id} draggableId={String(s.id)} index={idx}>
                        {(prov) => (
                          <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps} className="selected">
                            <div className="pos">{idx + 1}.</div>
                            <div className="info"><div className="title">{s.title}</div><div className="artist">{s.artist}</div></div>
                            <button onClick={() => removeAt(idx)}>✖</button>
                          </div>
                        )}
                      </Draggable>
                    ))}

                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            <div className="submit-row"><button className="submit-btn" onClick={handleSubmit}>Stemmen insturen</button></div>
          </aside>
        </main>

        <div className="side-banner right-banner">
          <div className="ad-content animation-banner"><div className="dancing-cat">🐱</div><h3>🍺 Geef Slaaj 2016-2026</h3><p>De beste slaajpokkoes van het afgelopen decenium!</p></div>
          <img src="https://i.imgur.com/Jn0km69.png" alt="Neue Kollektion" className="clickable-collection-img" onClick={openShop} />
        </div>
      </div>

      {/* popups */}
      {showPopup && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup-window" onClick={(e) => e.stopPropagation()}>
            <h2>🍻 Trek een bak!</h2>
            <img src="https://i.imgur.com/AZxrTGM.jpeg" alt="Trek een bak" className="popup-img" />
            <button className="close-popup" onClick={closePopup}>Sluiten</button>
          </div>
        </div>
      )}

{showShop && (
        <div className="popup-overlay" onClick={closeShop}>
          <div className="popup-window" onClick={(e) => e.stopPropagation()}>
            <h2>🛍️ NEUE KOLLEKTION</h2>
            <img
              src="https://i.imgur.com/6qIfIYz.png"
              alt="Kollektion"
              className="popup-img"
            />
            <img
              src="https://i.imgur.com/6e8s94t.png"
              alt="Kollektion"
              className="popup-img"
            />
            <img

            />
            <p>heute billig, morgen teuer</p>
            <button className="close-popup" onClick={closeShop}>
              Sluiten
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
