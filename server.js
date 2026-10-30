const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(path.join(__dirname, "public")));

const rooms = new Map();
const questions = [
  { q: "Which planet is known as the Red Planet?", a: ["Venus", "Mars", "Jupiter", "Mercury"], correct: 1 },
  { q: "How many sides does a hexagon have?", a: ["Five", "Six", "Seven", "Eight"], correct: 1 },
  { q: "Which animal is the tallest in the world?", a: ["Elephant", "Camel", "Giraffe", "Ostrich"], correct: 2 },
  { q: "What is the largest ocean on Earth?", a: ["Atlantic", "Indian", "Arctic", "Pacific"], correct: 3 },
  { q: "Which instrument has black and white keys?", a: ["Violin", "Piano", "Flute", "Drum"], correct: 1 },
  { q: "What do bees collect from flowers?", a: ["Nectar", "Sand", "Dew", "Leaves"], correct: 0 },
  { q: "How many minutes are in two hours?", a: ["100", "110", "120", "140"], correct: 2 },
  { q: "Which shape has three sides?", a: ["Square", "Triangle", "Circle", "Pentagon"], correct: 1 },
  { q: "Which season comes after spring?", a: ["Winter", "Autumn", "Summer", "Monsoon"], correct: 2 },
  { q: "What is the main language spoken in Brazil?", a: ["Spanish", "Portuguese", "French", "Italian"], correct: 1 }
];
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const code = () => Math.random().toString(36).slice(2, 6).toUpperCase();

function publicRoom(room) {
  return {
    code: room.code, hostId: room.hostId, state: room.state,
    players: [...room.players.values()].map(p => ({ id:p.id, name:p.name, score:p.score })),
    round: room.round, totalRounds: room.totalRounds,
    question: room.current ? { q:room.current.q, a:room.current.a } : null,
    answered: room.answers.size
  };
}
function emitRoom(room) { io.to(room.code).emit("room:update", publicRoom(room)); }
function cleanName(value) {
  return String(value || "Player").replace(/[<>]/g, "").trim().slice(0, 16) || "Player";
}

io.on("connection", socket => {
  socket.on("room:create", ({name}, cb=()=>{}) => {
    let c; do { c=code(); } while (rooms.has(c));
    const room = { code:c, hostId:socket.id, players:new Map(), state:"lobby", round:0, totalRounds:5, current:null, answers:new Map(), used:[] };
    room.players.set(socket.id, {id:socket.id, name:cleanName(name), score:0});
    rooms.set(c, room); socket.join(c); cb({ok:true, code:c}); emitRoom(room);
  });

  socket.on("room:join", ({code:c, name}, cb=()=>{}) => {
    const room=rooms.get(String(c||"").toUpperCase());
    if (!room) return cb({ok:false, error:"Room not found. Check the code and try again."});
    if (room.state!=="lobby") return cb({ok:false, error:"This game has already started."});
    if (room.players.size>=12) return cb({ok:false, error:"This room is full (12 players max)."});
    const player={id:socket.id,name:cleanName(name),score:0};
    room.players.set(socket.id,player); socket.join(room.code); cb({ok:true,code:room.code}); emitRoom(room);
    io.to(room.code).emit("notice", `${player.name} joined the room.`);
  });

  socket.on("game:start", () => {
    const room=[...rooms.values()].find(r=>r.hostId===socket.id);
    if (!room || room.state!=="lobby" || room.players.size<2) return;
    room.state="playing"; room.round=0; nextQuestion(room);
  });

  function nextQuestion(room) {
    if (room.round>=room.totalRounds) {
      room.state="finished"; room.current=null; emitRoom(room); return;
    }
    room.round++;
    let available=questions.filter((_,i)=>!room.used.includes(i));
    if (!available.length) { room.used=[]; available=questions; }
    const q=pick(available); room.used.push(questions.indexOf(q));
    room.current=q; room.answers.clear(); emitRoom(room);
    room.timer=setTimeout(()=>finishRound(room), 15000);
  }
  function finishRound(room) {
    if (room.state!=="playing") return;
    clearTimeout(room.timer);
    io.to(room.code).emit("round:reveal", {correct:room.current.correct, answer:room.current.a[room.current.correct]});
    setTimeout(()=>nextQuestion(room), 2600);
  }

  socket.on("answer:submit", ({choice}) => {
    const room=[...rooms.values()].find(r=>r.players.has(socket.id));
    if (!room || room.state!=="playing" || room.answers.has(socket.id)) return;
    const n=Number(choice);
    if (!Number.isInteger(n) || n<0 || n>3) return;
    const correct=n===room.current.correct;
    room.answers.set(socket.id,n);
    const p=room.players.get(socket.id);
    if (correct) p.score+=10;
    socket.emit("answer:result",{correct, points:correct?10:0});
    emitRoom(room);
    if (room.answers.size===room.players.size) finishRound(room);
  });

  socket.on("disconnect", () => {
    for (const room of rooms.values()) {
      if (!room.players.has(socket.id)) continue;
      const p=room.players.get(socket.id); room.players.delete(socket.id); room.answers.delete(socket.id);
      io.to(room.code).emit("notice", `${p.name} left the room.`);
      if (room.hostId===socket.id) {
        const next=room.players.keys().next().value;
        if (next) room.hostId=next;
        else { clearTimeout(room.timer); rooms.delete(room.code); continue; }
      }
      if (room.state==="playing" && room.answers.size===room.players.size) finishRound(room);
      else emitRoom(room);
    }
  });
});

const PORT=process.env.PORT || 3000;
server.listen(PORT,()=>console.log(`Friends Arena running on port ${PORT}`));
