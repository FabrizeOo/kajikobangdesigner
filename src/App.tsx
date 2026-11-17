import { FormEvent, lazy, Suspense, useEffect, useRef, useState } from "react";
import VideoScrollHero from "./components/VideoScrollHero";
import { categories, contact, mailLink, whatsappLink } from "./portfolio";

const LensCarousel = lazy(() => import("./components/LensCarousel"));

import barbwire from "./assets/stickers/barbwire.webp";
import crossFleur from "./assets/stickers/cross-fleur.webp";
import crossRed from "./assets/stickers/cross-red.webp";
import crossRuby from "./assets/stickers/cross-ruby.webp";
import crossSilver from "./assets/stickers/cross-silver.webp";
import crownBig from "./assets/stickers/crown-big.webp";
import dagger from "./assets/stickers/dagger.webp";
import fleur from "./assets/stickers/fleur.webp";
import heartBleed from "./assets/stickers/heart-bleed.webp";
import heartSpike from "./assets/stickers/heart-spike.webp";
import padlock from "./assets/stickers/padlock.webp";
import star2 from "./assets/stickers/star2.webp";
import wingL from "./assets/stickers/wing-l.webp";
import wingR from "./assets/stickers/wing-r.webp";
import portrait from "./assets/IMG_5923.png";

const city =
  "https://images.unsplash.com/photo-1599060052009-24d6d0b0161c?auto=format&fit=crop&w=1800&q=85";

const nav = [
  ["INICIO", "inicio"],
  ["TRABAJOS", "trabajos"],
  ["SERVICIOS", "servicios"],
  ["SOBRE MÍ", "sobre-mi"],
  ["CONTACTO", "contacto"],
];

type IconName = "arrow" | "close" | "menu" | "mail" | "instagram" | "whatsapp";

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: <path d="M5 12h14M14 7l5 5-5 5" />,
    close: <path d="M5 5l14 14M19 5L5 19" />,
    menu: <path d="M4 7h16M8 12h12M4 17h16" />,
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
    instagram: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <path d="M17.5 6.5h.01" />
      </>
    ),
    whatsapp: (
      <>
        <path d="M20 11.5a8 8 0 0 1-11.8 7l-4.2 1.3 1.4-4A8 8 0 1 1 20 11.5Z" />
        <path d="M9 8c.5 3 2 4.5 5 5" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

/** Decorative chrome sticker. `drift` adds scroll-linked parallax, `float` an idle bob. */
function Sticker({
  src,
  className = "",
  drift,
  float,
}: {
  src: string;
  className?: string;
  drift?: "up" | "down" | "spin";
  float?: boolean;
}) {
  return (
    <span
      className={`sticker ${drift ? `sticker--drift-${drift}` : ""} ${className}`}
      aria-hidden="true"
    >
      <img src={src} alt="" loading="lazy" className={float ? "sticker-float" : undefined} />
    </span>
  );
}

function SectionTitle({
  eyebrow,
  children,
  wings,
}: {
  eyebrow?: string;
  children: React.ReactNode;
  wings?: boolean;
}) {
  return (
    <div className={`section-heading reveal ${wings ? "section-heading--wings" : ""}`}>
      <p className="section-index">✝ KAJIKO BANG / 2026</p>
      <h2>
        {wings && <img className="wing wing--l" src={wingL} alt="" aria-hidden="true" />}
        <span className="drip-text">{children}</span>
        {wings && <img className="wing wing--r" src={wingR} alt="" aria-hidden="true" />}
      </h2>
      {eyebrow && (
        <p className="script-note">
          {eyebrow}
          <span>×</span>
        </p>
      )}
    </div>
  );
}

function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLElement>(null);
  const match = value.match(/^(\D*)(\d+(?:\.\d+)?)(.*)$/);
  const [shown, setShown] = useState(match ? `${match[1]}0${match[3]}` : value);

  useEffect(() => {
    const el = ref.current;
    if (!el || !match) return;
    const [, pre, num, post] = match;
    const end = parseFloat(num);
    const decimals = num.includes(".") ? num.split(".")[1].length : 0;
    const pad = num.startsWith("0") ? num.length : 0;
    const fmt = (v: number) => {
      const s = v.toFixed(decimals);
      return `${pre}${pad ? s.padStart(pad, "0") : s}${post}`;
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const run = (now: number) => {
          const t = Math.min((now - start) / 1400, 1);
          const k = 1 - Math.pow(1 - t, 4);
          setShown(t < 1 ? fmt(end * k) : value);
          if (t < 1) raf = requestAnimationFrame(run);
        };
        raf = requestAnimationFrame(run);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <strong ref={ref}>{shown}</strong>;
}

const services = [
  {
    title: "BANNERS",
    desc: "Banners anime para Twitter / X, Twitch y redes. Overlays a pedido.",
    category: "banners",
  },
  {
    title: "THUMBNAILS",
    desc: "Miniaturas de YouTube que detienen el scroll y generan clics.",
    category: "youtube",
  },
  {
    title: "MÚSICA",
    desc: "Banners y artes para artistas, lanzamientos y playlists.",
    category: "music",
  },
  {
    title: "FLYERS",
    desc: "Eventos, fechas, promociones y piezas para historias.",
    category: "flyers",
  },
];

function App() {
  const [loaded, setLoaded] = useState(false);
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [categoryId, setCategoryId] = useState(categories[0].id);
  const category = categories.find((c) => c.id === categoryId) ?? categories[0];

  useEffect(() => {
    const timer = window.setTimeout(() => setLoaded(true), 1300);
    const onScroll = () => setScrolled(window.scrollY > 32);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
    const key = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    window.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", key);
    };
  }, [menu]);

  useEffect(() => {
    const nodes = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.15, rootMargin: "0px 0px -6% 0px" },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const showCategory = (id: string) => {
    setCategoryId(id);
    document.getElementById("trabajos")?.scrollIntoView({ behavior: "smooth" });
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const via = (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") ?? "whatsapp";
    const name = String(data.get("name") ?? "").trim();
    const service = String(data.get("service") || "un diseño");
    const message = String(data.get("message") ?? "").trim();
    const text = `Hola Kajiko, soy ${name}. Me interesa ${service.toLowerCase()}.\n\n${message}`;
    if (via === "email") window.location.href = mailLink(`Cotización: ${service} — ${name}`, text);
    else window.open(whatsappLink(text), "_blank", "noopener,noreferrer");
  };

  const socials = [
    {
      icon: "instagram" as const,
      title: "INSTAGRAM",
      sub: contact.instagramHandle,
      href: contact.instagram,
    },
    {
      icon: "whatsapp" as const,
      title: "WHATSAPP",
      sub: contact.whatsappDisplay,
      href: whatsappLink("Hola Kajiko, vi tu portafolio y quiero cotizar un diseño."),
    },
    {
      icon: "mail" as const,
      title: "CORREO",
      sub: contact.email.toUpperCase(),
      href: mailLink("Cotización de diseño"),
    },
  ];

  return (
    <div className={loaded ? "app loaded" : "app"}>
      <div className="preloader" aria-hidden={loaded}>
        <div className="preloader-logo" data-text="KB">
          KB
        </div>
        <p>KAJIKO BANG / PORTFOLIO 2026</p>
        <div className="load-track">
          <span />
        </div>
      </div>

      <header className={scrolled ? "navbar navbar--scrolled" : "navbar"}>
        <a href="#inicio" className="logo" aria-label="Kajiko Bang, inicio">
          K<span>B</span>
        </a>
        <nav className="desktop-nav" aria-label="Navegación principal">
          {nav.map(([label, id]) => (
            <a key={id} href={`#${id}`}>
              {label}
            </a>
          ))}
        </nav>
        <a href="#contacto" className="nav-hire">
          CONTRATAR <span>↗</span>
        </a>
        <button className="menu-trigger" aria-label="Abrir menú" onClick={() => setMenu(true)}>
          <Icon name="menu" size={28} />
        </button>
      </header>

      <div className={menu ? "mobile-menu open" : "mobile-menu"} aria-hidden={!menu} inert={!menu}>
        <button aria-label="Cerrar menú" onClick={() => setMenu(false)}>
          <Icon name="close" size={34} />
        </button>
        <span className="menu-label">MENÚ / 2026</span>
        <nav>
          {nav.map(([label, id], i) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={() => setMenu(false)}
              style={{ transitionDelay: menu ? `${80 + i * 50}ms` : "0ms" }}
            >
              <small>0{i + 1}</small>
              {label}
            </a>
          ))}
        </nav>
        <div className="mobile-socials">
          <a href={contact.instagram} target="_blank" rel="noopener noreferrer">
            INSTAGRAM
          </a>
          <a href={socials[1].href} target="_blank" rel="noopener noreferrer">
            WHATSAPP
          </a>
          <a href={socials[2].href}>CORREO</a>
        </div>
      </div>

      <main>
        <VideoScrollHero />

        <div className="ticker-wrap" aria-label="Servicios disponibles">
          <div className="ticker">
            <span>
              BANNERS ✝ OVERLAYS ✝ THUMBNAILS ✝ FLYERS ✝ ANIME ✝ GAMING ✝ MÚSICA ✝ TWITCH ✝
            </span>
            <span aria-hidden="true">
              BANNERS ✝ OVERLAYS ✝ THUMBNAILS ✝ FLYERS ✝ ANIME ✝ GAMING ✝ MÚSICA ✝ TWITCH ✝
            </span>
          </div>
          <div className="ticker ticker--back">
            <span>
              ANIME × MÚSICA × GAMING × TWITCH × YOUTUBE × ANIME × MÚSICA × GAMING × TWITCH ×
            </span>
            <span aria-hidden="true">
              ANIME × MÚSICA × GAMING × TWITCH × YOUTUBE × ANIME × MÚSICA × GAMING × TWITCH ×
            </span>
          </div>
        </div>

        <section id="trabajos" className="work-section">
          <div className="section work-head">
            <SectionTitle wings>TRABAJOS</SectionTitle>
            <div className="category-tabs reveal" role="tablist" aria-label="Categorías">
              {categories.map((c) => (
                <button
                  key={c.id}
                  role="tab"
                  aria-selected={c.id === category.id}
                  className={c.id === category.id ? "active" : ""}
                  onClick={() => setCategoryId(c.id)}
                >
                  {c.label}
                  <sup>{String(c.items.length).padStart(2, "0")}</sup>
                </button>
              ))}
            </div>
          </div>
          <div className="lens-wrap" role="tabpanel" aria-label={category.label}>
            <Suspense fallback={<div className="lens-stage" />}>
              <LensCarousel
                key={category.id}
                items={category.items}
                aspect={category.aspect}
                label={category.label}
              />
            </Suspense>
          </div>
          <div className="center-action">
            <a
              className="button button--outline"
              href={contact.instagram}
              target="_blank"
              rel="noopener noreferrer"
            >
              VER MÁS EN INSTAGRAM <Icon name="arrow" />
            </a>
          </div>
        </section>

        <section id="servicios" className="section services-section">
          <Sticker src={dagger} className="st-dagger" drift="spin" />
          <SectionTitle>SERVICIOS</SectionTitle>
          <div className="services-grid">
            {services.map((s, i) => {
              const cover = categories.find((c) => c.id === s.category)!.items[i === 3 ? 2 : 1];
              return (
                <article
                  className="service-card reveal"
                  key={s.title}
                  style={{ transitionDelay: `${i * 70}ms` }}
                >
                  <button
                    className="service-box"
                    onClick={() => showCategory(s.category)}
                    aria-label={`Ver trabajos de ${s.title}`}
                  >
                    <img src={cover.src} alt="" loading="lazy" />
                    <span>0{i + 1}</span>
                    <h3>{s.title}</h3>
                    <b className="service-peek">VER TRABAJOS ↗</b>
                  </button>
                  <p>{s.desc}</p>
                  <a
                    href={whatsappLink(`Hola Kajiko, quiero cotizar: ${s.title.toLowerCase()}.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    COTIZAR <Icon name="arrow" size={18} />
                  </a>
                </article>
              );
            })}
          </div>
        </section>

        <section id="sobre-mi" className="section about-section">
          <div className="about-image reveal">
            <img src={portrait} alt="Retrato en blanco y negro" loading="lazy" />
            <Sticker src={heartBleed} className="st-about-heart" float />
            <b>
              CREATIVE
              <br />
              DIRECTOR
            </b>
          </div>
          <div className="about-copy reveal">
            <Sticker src={crossRed} className="st-about-cross" drift="up" />
            <p className="section-index">PERÚ</p>
            <h2>
              <span className="drip-text">
                SOBRE
                <br />
                MÍ
              </span>
            </h2>
            <p className="about-lead">
              Soy Kajiko Bang, diseñador gráfico de Perú. Creo banners, overlays y piezas visuales
              para streamers, músicos y marcas.
            </p>
            <p className="about-body">
              Disponible para proyectos freelance y trabajo a tiempo completo.
            </p>
            <div className="tools">
              {["PHOTOSHOP", "ILLUSTRATOR", "FIGMA", "AFTER EFFECTS"].map((t, i) => (
                <span key={t} style={{ transitionDelay: `${300 + i * 60}ms` }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="stats reveal">
            {[
              ["+3.6K", "VISTAS EN BEHANCE"],
              [String(categories.reduce((n, c) => n + c.items.length, 0)), "DISEÑOS EN PORTAFOLIO"],
              ["89", "APRECIOS"],
              ["24/7", "DISPONIBLE FULL-TIME"],
            ].map(([value, label]) => (
              <div key={label}>
                <CountUp value={value} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="section process-section">
          <SectionTitle>CÓMO TRABAJO</SectionTitle>
          <div className="barbwire reveal" aria-hidden="true">
            <img src={barbwire} alt="" loading="lazy" />
          </div>
          <div className="process-line">
            {[
              ["BRIEF", "Hablamos de tu idea, objetivo y referencias.", padlock],
              ["BOCETO", "Propuesta visual y composición.", crossRuby],
              ["DISEÑO", "Desarrollo de la pieza final.", heartSpike],
              ["ENTREGA", "Archivos finales listos para publicar.", star2],
            ].map(([title, desc, icon], i) => (
              <article
                className="reveal"
                key={title}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <img className="process-icon" src={icon} alt="" aria-hidden="true" loading="lazy" />
                <strong>0{i + 1}</strong>
                <i />
                <h3>{title}</h3>
                <p>{desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="contacto"
          className="contact-section"
          style={{
            backgroundImage: `linear-gradient(90deg,rgba(0,0,0,.96),rgba(0,0,0,.72)),url(${city})`,
          }}
        >
          <div className="contact-head reveal">
            <Sticker src={crownBig} className="st-crown" float />
            <span>¿TIENES UNA IDEA?</span>
            <h2>
              <span className="drip-text">
                TRABA
                <br />
                JEMOS.
              </span>
            </h2>
            <p className="script-note">
              Banners · overlays · thumbnails.<span>×</span>
            </p>
          </div>
          <div className="contact-content">
            <div className="contact-links reveal">
              <p>
                CUÉNTAME QUÉ NECESITAS.
                <br />
                TE RESPONDO CON ALCANCE, TIEMPO Y COTIZACIÓN.
              </p>
              {socials.map(({ icon, title, sub, href }) => (
                <a
                  href={href}
                  key={title}
                  {...(icon === "mail" ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                >
                  <Icon name={icon} />
                  <span>
                    <b>{title}</b>
                    <small>{sub}</small>
                  </span>
                  <Icon name="arrow" />
                </a>
              ))}
            </div>
            <form className="contact-form reveal" onSubmit={submit}>
              <Sticker src={crossSilver} className="st-form-cross" drift="down" />
              <div className="field-row">
                <label>
                  NOMBRE
                  <input name="name" required placeholder="¿CÓMO TE LLAMAS?" autoComplete="name" />
                </label>
                <label>
                  TIPO DE SERVICIO
                  <select name="service" defaultValue="">
                    <option value="" disabled>
                      SELECCIONA UNO
                    </option>
                    <option>BANNER</option>
                    <option>OVERLAY</option>
                    <option>THUMBNAIL</option>
                    <option>FLYER</option>
                    <option>OTRO</option>
                  </select>
                </label>
              </div>
              <label>
                CUÉNTAME TU IDEA
                <textarea
                  name="message"
                  required
                  rows={5}
                  placeholder="DETALLES DEL PROYECTO..."
                />
              </label>
              <div className="form-actions">
                <button className="button button--primary" type="submit" value="whatsapp">
                  ENVIAR POR WHATSAPP <Icon name="whatsapp" />
                </button>
                <button className="button button--outline" type="submit" value="email">
                  POR CORREO <Icon name="mail" />
                </button>
              </div>
              <div className="form-meta">
                <span>RESPONDO EN MENOS DE 24 HORAS.</span>
                <span>PERÚ / GMT-5</span>
              </div>
            </form>
          </div>
        </section>
      </main>

      <footer className="footer">
        <a href="#inicio" className="logo" aria-label="Volver al inicio">
          K<span>B</span>
        </a>
        <div>
          <p>
            © 2026 KAJIKO BANG.
            <br />
            TODOS LOS DERECHOS RESERVADOS.
          </p>
        </div>
        <nav aria-label="Redes sociales">
          {socials.map(({ title, href, icon }) => (
            <a
              key={title}
              href={href}
              {...(icon === "mail" ? {} : { target: "_blank", rel: "noopener noreferrer" })}
            >
              {title}
            </a>
          ))}
        </nav>
        <a className="back-top" href="#inicio">
          <img src={fleur} alt="" aria-hidden="true" />
          VOLVER ARRIBA ↑
        </a>
        <img className="footer-cross" src={crossFleur} alt="" aria-hidden="true" loading="lazy" />
      </footer>
    </div>
  );
}

export default App;
