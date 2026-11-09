import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { Menu, Volume2, VolumeX, X } from "lucide-react";
import { sound, type SfxName } from "@/lib/sound";

const MEMBERS = [
  {
    role: "Líder",
    copy: "Comanda a irmandade e decide quando a lâmina sai da bainha.",
    image: "/art/leader.jpg",
    alt: "Guerreiro de armadura de bronze à luz de tochas",
  },
  {
    role: "Oficiais",
    copy: "Organizam raids, rotas e a defesa da fortaleza.",
    image: "/art/officer.jpg",
    alt: "Guerreira com pintura de guerra e escudo de bronze",
  },
  {
    role: "Membros",
    copy: "A força da irmandade: construtores, caçadores e sentinelas.",
    image: "/art/member.jpg",
    alt: "Jovem guerreiro de armadura de couro com lança",
  },
] as const;

const EMBERS = [
  { left: "6%", delay: "0s", duration: "14s", gold: true },
  { left: "18%", delay: "2s", duration: "11s", gold: false },
  { left: "31%", delay: "4.5s", duration: "16s", gold: true },
  { left: "44%", delay: "1s", duration: "12s", gold: false },
  { left: "57%", delay: "3s", duration: "15s", gold: true },
  { left: "69%", delay: "6s", duration: "13s", gold: false },
  { left: "81%", delay: "2.4s", duration: "17s", gold: true },
  { left: "92%", delay: "5s", duration: "12s", gold: false },
];

function useSoundVersion() {
  return useSyncExternalStore(
    (cb) => sound.subscribe(cb),
    () => sound.version,
    () => 0,
  );
}

function hit(name: SfxName, gap = 0) {
  sound.unlock();
  sound.play(name, gap);
}

export function ClanPortal() {
  const version = useSoundVersion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [note, setNote] = useState(
    "O formulário prepara uma mensagem neste aparelho. Nada é enviado a um servidor.",
  );
  const year = new Date().getFullYear();

  useEffect(() => {
    sound.loadPrefs();
    const onVis = () => {
      if (document.visibilityState === "visible") sound.resumeIfNeeded();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    hit("horn");
    const form = event.currentTarget;
    const data = new FormData(form);
    const nickname = String(data.get("nickname") ?? "").trim();
    const game = String(data.get("game") ?? "").trim();
    const platform = String(data.get("platform") ?? "").trim();
    const message = String(data.get("message") ?? "").trim() || "(sem mensagem adicional)";
    const text = `Solicitação de entrada — SPECTROS\n\nNick: ${nickname}\nJogo: ${game}\nPlataforma: ${platform}\nMensagem: ${message}`;
    const done = () => {
      setNote("Mensagem copiada. Cole no canal de recrutamento do clã.");
      form.reset();
    };
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(text).then(done).catch(() => setNote(text));
    } else {
      setNote(text);
    }
  }

  const live = sound.unlocked && !sound.muted;
  void version;

  return (
    <div className="portal">
      <div className="embers" aria-hidden="true">
        {EMBERS.map((ember) => (
          <span
            key={ember.left}
            className={ember.gold ? "ember gold" : "ember"}
            style={{ left: ember.left, animationDelay: ember.delay, animationDuration: ember.duration }}
          />
        ))}
      </div>
      <header className="topbar">
        <a className="brand" href="#inicio" onPointerDown={() => hit("chime", 180)}>
          <Mark />
          SPECTROS
        </a>
        <button
          className="menu-toggle"
          type="button"
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuOpen}
          onPointerDown={() => hit("scrape", 160)}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <nav id="mainNav" className="nav" data-open={menuOpen ? "true" : "false"}>
          <a href="#inicio" onPointerDown={() => hit("tick", 90)} onClick={() => setMenuOpen(false)}>
            Início
          </a>
          <a href="#sobre" onPointerDown={() => hit("tick", 90)} onClick={() => setMenuOpen(false)}>
            O clã
          </a>
          <a href="#membros" onPointerDown={() => hit("tick", 90)} onClick={() => setMenuOpen(false)}>
            Membros
          </a>
          <a href="#eventos" onPointerDown={() => hit("tick", 90)} onClick={() => setMenuOpen(false)}>
            Eventos
          </a>
          <a href="#recrutamento" onPointerDown={() => hit("tick", 90)} onClick={() => setMenuOpen(false)}>
            Recrutamento
          </a>
        </nav>
        <SoundDock
          open={panelOpen}
          live={live}
          onToggle={() => {
            hit("tick", 80);
            setPanelOpen((open) => !open);
          }}
        />
      </header>

      <main>
        <section className="hero" id="inicio">
          <img className="hero-bg" src="/art/hero.jpg" alt="" />
          <div className="hero-shade" />
          <div className="hero-copy reveal">
            <p className="eyebrow">HONRA · UNIÃO · CONQUISTA</p>
            <h1>
              NAS SOMBRAS,
              <span>NASCEM AS LENDAS.</span>
            </h1>
            <p className="lede">
              Um clã forjado no deserto e no ferro. Exilados unidos por estratégia, respeito e a vontade de
              erguer um nome entre as ruínas. Entre na batalha e escreva sua saga com os SPECTROS.
            </p>
            <div className="actions">
              <a className="btn btn-primary" href="#recrutamento" onPointerDown={() => hit("drum")}>
                Quero fazer parte
              </a>
              <a className="btn btn-ghost" href="#sobre" onPointerDown={() => hit("strike")}>
                Conheça o clã
              </a>
            </div>
            <p className="listen-note">
              {live
                ? "O vento das ruínas está no ar. O botão dourado silencia quando quiser."
                : "Toque em qualquer lugar para ouvir vento, brasas e o metal do clã."}
            </p>
          </div>
        </section>

        <section className="section" id="sobre">
          <p className="eyebrow">Nossa identidade</p>
          <h2>Mais que um clã.</h2>
          <p className="section-intro">
            Comunidade de jogadores unidos pela tática e pela palavra dada. Cada vitória é construída em
            equipe — dentro e fora da arena.
          </p>
          <div className="grid-3">
            <article className="card" onPointerEnter={() => hit("whoosh", 220)}>
              <Sword />
              <h3>Força</h3>
              <p>Desafios enfrentados com coragem e disciplina, sem recuar da linha.</p>
            </article>
            <article className="card" onPointerEnter={() => hit("whoosh", 220)}>
              <Rampart />
              <h3>Estratégia</h3>
              <p>Planejamento de base, rotas de recurso e coordenação em cada missão.</p>
            </article>
            <article className="card" onPointerEnter={() => hit("whoosh", 220)}>
              <Knot />
              <h3>Lealdade</h3>
              <p>Respeito e parceria. O nome do clã pesa mais do que um saque fácil.</p>
            </article>
          </div>
        </section>

        <section className="section band" id="membros">
          <p className="eyebrow">A irmandade</p>
          <h2>Nossos guerreiros</h2>
          <p className="section-intro">Líderes, oficiais e a linha que segura a muralha.</p>
          <div className="grid-3">
            {MEMBERS.map((member) => (
              <article className="card member" key={member.role} onPointerEnter={() => hit("whoosh", 240)}>
                <img src={member.image} alt={member.alt} />
                <h3>{member.role}</h3>
                <p>{member.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="eventos">
          <p className="eyebrow">Agenda do clã</p>
          <h2>Próximas missões</h2>
          <div className="events">
            <article className="event">
              <div>
                <strong>01</strong>
                <span>EVENTO</span>
              </div>
              <div>
                <h3>Treino de equipe</h3>
                <p>Alinhar estratégias, chamadas e a comunicação em campo.</p>
              </div>
              <span className="status">A definir</span>
            </article>
            <article className="event">
              <div>
                <strong>02</strong>
                <span>EVENTO</span>
              </div>
              <div>
                <h3>Reunião da irmandade</h3>
                <p>Novidades, planejamento da base e integração de novos membros.</p>
              </div>
              <span className="status">A definir</span>
            </article>
          </div>
        </section>

        <section className="section" id="recrutamento">
          <div className="recruit">
            <img className="recruit-bg" src="/art/runes.jpg" alt="" />
            <div className="recruit-card">
              <p className="eyebrow">Sua jornada começa aqui</p>
              <h2>Aceita o chamado?</h2>
              <p className="section-intro">Deixe seu nome. O clã responde no canal da irmandade.</p>
              <form onSubmit={onSubmit}>
                <label>
                  Seu nome ou nick
                  <input
                    name="nickname"
                    required
                    maxLength={48}
                    placeholder="Como devemos chamar você?"
                    onFocus={() => hit("tick", 120)}
                  />
                </label>
                <label>
                  Jogo principal
                  <input
                    name="game"
                    required
                    maxLength={48}
                    placeholder="Qual jogo você joga?"
                    onFocus={() => hit("tick", 120)}
                  />
                </label>
                <label>
                  Plataforma
                  <select
                    name="platform"
                    required
                    defaultValue=""
                    onFocus={() => hit("tick", 120)}
                  >
                    <option value="" disabled>
                      Escolha onde você joga
                    </option>
                    <option value="PC">PC</option>
                    <option value="Xbox">Xbox</option>
                    <option value="xCloud">xCloud</option>
                  </select>
                </label>
                <label>
                  Mensagem
                  <textarea
                    name="message"
                    rows={4}
                    maxLength={400}
                    placeholder="Conte um pouco sobre você (opcional)"
                    onFocus={() => hit("tick", 120)}
                  />
                </label>
                <button className="btn btn-primary" type="submit">
                  Preparar solicitação
                </button>
                <p className="form-note" role="status">
                  {note}
                </p>
              </form>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <a href="#inicio" onPointerDown={() => hit("chime", 200)}>
          SPECTROS
        </a>
        <p>© {year} SPECTROS. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}

function SoundDock({ open, live, onToggle }: { open: boolean; live: boolean; onToggle: () => void }) {
  const version = useSoundVersion();
  void version;

  return (
    <div className="sound-wrap">
      <button
        className="icon-btn"
        type="button"
        data-live={live ? "true" : "false"}
        aria-expanded={open}
        aria-controls="sound-panel"
        aria-label={live ? "Ajustar som" : "Ativar som"}
        onClick={onToggle}
        onPointerDown={() => sound.unlock()}
      >
        {live ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>
      {open ? (
        <div className="sound-panel" id="sound-panel" role="region" aria-label="Controles de som">
          <h2>SOM DAS RUÍNAS</h2>
          <label className="sound-row">
            Ambiente
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(sound.musicLevel * 100)}
              onChange={(event) => sound.setMusicLevel(Number(event.target.value) / 100)}
            />
          </label>
          <label className="sound-row">
            Efeitos
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(sound.sfxLevel * 100)}
              onChange={(event) => sound.setSfxLevel(Number(event.target.value) / 100)}
              onPointerUp={() => sound.play("strike")}
            />
          </label>
          <button
            className="mute-line"
            type="button"
            onPointerDown={(event) => {
              event.stopPropagation();
              const silencing = !sound.muted;
              sound.unlock();
              sound.setMuted(silencing);
              if (!silencing) sound.play("chime");
            }}
          >
            {sound.muted ? "ATIVAR SOM" : "SILENCIAR"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Mark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16 2 19 12l10 1.2L21.2 19l2 10L16 23.6 8.8 29l2-10L3 13.2 13 12z"
      />
    </svg>
  );
}

function Sword() {
  return (
    <svg className="glyph" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M18 3 29 14 18 16 16 14z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M15 15 5 25" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 20h6M6 24h6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function Rampart() {
  return (
    <svg className="glyph" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M4 28V14h6v4h4v-4h4v4h4v-4h6v14" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function Knot() {
  return (
    <svg className="glyph" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16 4v8M16 20v8M4 16h8M20 16h8" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
