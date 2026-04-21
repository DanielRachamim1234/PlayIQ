import { useState, useRef, useEffect } from 'react';
import pickIcon from '../public/pick-icon.png';

import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase'; // adjust path if needed
import { recordCanvas } from './utils/recordCanvas'; 
import { uploadVideoToStorage } from './uploadVideo'; // ✅ Make sure this import exists




// Save function:
const savePlayToFirestore = async (playData: any) => {
  try {
    await addDoc(collection(db, 'plays'), {
      createdAt: serverTimestamp(),
      ...playData
    });
    console.log('✅ Play saved successfully!');
  } catch (error) {
    console.error('❌ Error saving play:', error);
  }
};




// === Type Definitions ===
type Player = {
  id: number;
  x: number;
  y: number;
  label: string;
};

type ArrowPoint = {
  playerId: number;
  points: { x: number; y: number }[];
};

type SavedPlay = {
  id: string;
  players: Player[];
  ballOwner: number;
  createdAt: string;
  videoUrl: string;
};

function App() {
  

  const [players, setPlayers] = useState<Player[]>([
    { id: 1, x: 385, y: 20, label: "PG" },
    { id: 2, x: 650, y: 100, label: "SG" },
    { id: 3, x: 120, y: 100, label: "SF" },
    { id: 4, x: 260, y: 300, label: "PF" },
    { id: 5, x: 500, y: 360, label: "C" }
  ]);

  const [removedPlayers, setRemovedPlayers] = useState<Player[]>([]);
  const [, forceUpdate] = useState(0);
  const [playerIdWithBall, setPlayerIdWithBall] = useState<number | null>(null);
  const [ballPosition, setBallPosition] = useState<{ x: number; y: number } | null>(null);
  const [isPassing, setIsPassing] = useState(false);

  const [pickMarkMode, setPickMarkMode] = useState(false);
  const [markedScreeners, setMarkedScreeners] = useState<number[]>([]);


  const previousPositions = useRef<Map<number, { x: number; y: number }>>(new Map());
  const ghostPath = useRef<ArrowPoint | null>(null);
  const draggingPlayerId = useRef<number | null>(null);
  const wasDragging = useRef(false);
  const [hoveredPlayerId, setHoveredPlayerId] = useState<number | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [savedPlays, setSavedPlays] = useState<SavedPlay[]>([]);



  const recordAndSavePlay = async () => {
    const courtElement = document.getElementById('court');
    if (!courtElement) {
      console.error("❌ Court element not found!");
      return;
    }

    try {
      const videoBlob = await recordCanvas(courtElement, 5, 10); // 5 seconds @ 10fps
      const fileName = `play_${Date.now()}.webm`;
      const videoUrl = await uploadVideoToStorage(videoBlob, fileName);

      const playData = {
        players,
        ballOwner: playerIdWithBall,
        createdAt: new Date().toISOString(),
        videoUrl
      };

      await savePlayToFirestore(playData);
      await loadSavedPlays();
      alert('✅ Play recorded and saved to Firestore & Storage!');
    } catch (error) {
      console.error("❌ Error recording/saving play:", error);
      alert('❌ Failed to record the play. Check console.');
    }

  };

  const loadSavedPlays = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'plays'));
      const plays = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SavedPlay[];

      setSavedPlays(plays);
    } catch (error) {
      console.error("❌ Failed to fetch plays:", error);
    }
  };



  
  const playerColors: { [label: string]: string } = {
    PG: 'red', SG: 'blue', SF: 'green', PF: 'purple', C: 'black'
  };

  const resetFormation = () => {
    const initialPlayers: Player[] = [
      { id: 1, x: 385, y: 20, label: "PG" },
      { id: 2, x: 650, y: 100, label: "SG" },
      { id: 3, x: 120, y: 100, label: "SF" },
      { id: 4, x: 260, y: 300, label: "PF" },
      { id: 5, x: 500, y: 360, label: "C" }
    ];
    setPlayers(initialPlayers);
    setRemovedPlayers([]);
    updateBallHolder(initialPlayers);
  };

  const markPlayerAsScreener = (id: number) => {
    setMarkedScreeners(prev => [...prev, id]);
    setTimeout(() => {
      setMarkedScreeners(prev => prev.filter(p => p !== id));
    }, 3000);
  };



  const updateBallHolder = (playerList: Player[]) => {
    if (playerList.length === 0) {
      setPlayerIdWithBall(null);
      setBallPosition(null);
    } else {
      const lowestId = Math.min(...playerList.map(p => p.id));
      setPlayerIdWithBall(lowestId);
      const newPlayer = playerList.find(p => p.id === lowestId);
      if (newPlayer) {
        setBallPosition({ x: newPlayer.x + 45, y: newPlayer.y });
      }
    }
  };

  useEffect(() => {
    updateBallHolder(players);
  }, []);

  const handleMouseDown = (id: number) => {
    wasDragging.current = false;
    draggingPlayerId.current = id;
    const player = players.find(p => p.id === id);
    if (player) {
      previousPositions.current.set(id, { x: player.x, y: player.y });
      ghostPath.current = {
        playerId: id,
        points: [{ x: player.x + 20, y: player.y + 20 }]
      };
    }
  };

  const handleMouseUp = () => {
    draggingPlayerId.current = null;
    ghostPath.current = null;
    forceUpdate(n => n + 1);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    wasDragging.current = true;
    const id = draggingPlayerId.current;
    if (id === null) return;

    const courtRect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const newX = e.clientX - courtRect.left - 20;
    const newY = e.clientY - courtRect.top - 20;

    setPlayers(prev => prev.map(p => (p.id === id ? { ...p, x: newX, y: newY } : p)));
    if (id === playerIdWithBall) {
      setBallPosition({ x: newX + 45, y: newY });
    }
    if (ghostPath.current && ghostPath.current.playerId === id) {
      ghostPath.current.points.push({ x: newX + 20, y: newY + 20 });
      forceUpdate(n => n + 1);
    }
  };

  const handlePlayerClick = (id: number) => {
  if (pickMarkMode) {
    markPlayerAsScreener(id); // ✅ no disabling mode here!
  } else {
    passBallTo(id); // ✅ only if not in screen-marking mode
  }
};



  const handleRemovePlayer = (id: number) => {
    setPlayers(prev => {
      const updated = prev.filter(p => p.id !== id);
      updateBallHolder(updated);
      
      const playerToRemove = prev.find(p => p.id === id);
      if (!playerToRemove) return updated;
      setRemovedPlayers(removed => {
        if (removed.some(p => p.id === id)) return removed;
        return [...removed, playerToRemove];
      });
      return updated;
    });
  };

  const handleRestoreAll = () => {
    setPlayers(prev => {
      const existingIds = new Set(prev.map(p => p.id));
      const newPlayers = removedPlayers.filter(p => !existingIds.has(p.id));
      const updated = [...prev, ...newPlayers];
      updateBallHolder(updated);
      return updated;
    });
    setRemovedPlayers([]);
  };

  const handleRestoreOne = (id: number) => {
    const player = removedPlayers.find(p => p.id === id);
    if (!player) return;
    setPlayers(prev => {
      if (prev.some(p => p.id === id)) return prev;
      const updated = [...prev, player];
      updateBallHolder(updated);
      return updated;
    });
    setRemovedPlayers(prev => prev.filter(p => p.id !== id));
  };

  const passBallTo = (targetId: number) => {
    if (targetId === playerIdWithBall || isPassing) return;
    const fromPlayer = players.find(p => p.id === playerIdWithBall);
    const toPlayer = players.find(p => p.id === targetId);
    if (!fromPlayer || !toPlayer) return;

    setIsPassing(true);
    const startX = fromPlayer.x + 45;
    const startY = fromPlayer.y;
    const endX = toPlayer.x + 45;
    const endY = toPlayer.y;

    const steps = 20;
    let step = 0;
    const dx = (endX - startX) / steps;
    const dy = (endY - startY) / steps;

    const animate = () => {
      step++;
      setBallPosition({ x: startX + dx * step, y: startY + dy * step });
      if (step < steps) {
        requestAnimationFrame(animate);
      } else {
        setPlayerIdWithBall(targetId);
        setBallPosition({ x: endX, y: endY });
        setIsPassing(false);
      }
    };

    setBallPosition({ x: startX, y: startY });
    requestAnimationFrame(animate);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial' }}>
      <h1>PlayIQ 🏀</h1>
      <p>Click and drag players around the court.</p>

      <button onClick={() => updateBallHolder(players)}>Reset Ball</button>
      <button onClick={resetFormation}>Reset Formation</button>
      
      <button onClick={() => {
        setPickMarkMode(true);
        setTimeout(() => {
          setPickMarkMode(false); // auto-disable after 4 sec
        }, 3000);
      }}>Mark Screener</button>

      <button onClick={() => 
        savePlayToFirestore({
          players,
          ghostPath: ghostPath.current,
          ballOwner: playerIdWithBall
        })
      }>
        Save Play
      </button>
      {removedPlayers.length > 0 && (
        <button onClick={handleRestoreAll}>Restore All Players</button>
      )}

      <button onClick={recordAndSavePlay}>
      {isRecording ? '⏹ Stop & Save Play' : '🎥 Record & Save Play'}
      </button>

      <button onClick={loadSavedPlays}>📂 Load Saved Plays</button>

      <br /><br />

      {[...removedPlayers]
        .sort((a, b) => a.id - b.id)
        .map(player => (
          <button key={player.id} onClick={() => handleRestoreOne(player.id)}>
            Restore {player.label}
          </button>
        ))}

      <div
        id = "court"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          position: 'relative',
          width: 800,
          height: 500,
          border: '4px solid #222',
          backgroundImage: 'url("/half-court.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderRadius: '8px',
          overflow: 'hidden',
          userSelect: 'none'
        }}
      >
        <svg style={{ position: 'absolute', width: '100%', height: '100%' }}>
          {ghostPath.current && (
            <polyline
              points={ghostPath.current.points.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={playerColors[
                players.find(p => p.id === ghostPath.current?.playerId)?.label || "PG"
              ]}
              strokeWidth="2"
              strokeOpacity="0.6"
              strokeDasharray="6,4"
            />
          )}
        </svg>

        {savedPlays.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h3>📼 Saved Plays</h3>
            {savedPlays.map(play => (
              <div key={play.id} style={{ marginBottom: '1rem' }}>
                <strong>{new Date(play.createdAt).toLocaleString()}</strong>
                <br />
                <video controls width="400" src={play.videoUrl}></video>
              </div>
            ))}
          </div>
        )}

        {ballPosition && (
          <div style={{
            position: 'absolute',
            left: ballPosition.x,
            top: ballPosition.y,
            fontSize: '20px'
          }}>
            🏀
          </div>
        )}

        {players.map(player => (
        <div
          key={player.label}
          onMouseDown={() => handleMouseDown(player.id)}
          onDoubleClick={() => handleRemovePlayer(player.id)}
          onClick={() => {
            if (!wasDragging.current) {
              handlePlayerClick(player.id);
            }
          }}
          onMouseEnter={() => setHoveredPlayerId(player.id)}
          onMouseLeave={() => setHoveredPlayerId(null)}
          style={{
            position: 'absolute',
            left: player.x,
            top: player.y,
            width: 40,
            height: 40,
            backgroundColor: '#007bff',
            borderRadius: '50%',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'box-shadow 0.2s ease-in-out',
            boxShadow: hoveredPlayerId === player.id && player.id !== playerIdWithBall
              ? '0 0 20px 6px rgba(0, 153, 255, 0.9)'
              : 'none'
          }}
        >
          {player.label}

          {/* ✅ Pick Icon Displayed for 2 Seconds After Marking */}
          {markedScreeners.includes(player.id) && (
          <img
            src={pickIcon}
            alt="pick"
            style={{
              position: 'absolute',
              left: 40,
              top: 10,
              width: 20,
              height: 20
            }}
          />
        )}

        </div>
      ))}

      </div>
    </div>
  );
}

export default App;