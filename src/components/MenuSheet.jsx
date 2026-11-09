import { useEffect, useRef } from 'react';
import { I } from '../config.js';
import Ic from './Icon.jsx';

/* Menu principal : se déplie depuis le haut et liste les fonctionnalités de l'app.
   sections = [{ title, items: [{ key, icon, label, sub, onClick, badge, lock, active }] }] */
export default function MenuSheet({ sections, footer, onClose }) {
  const panel = useRef(null);
  useEffect(() => {
    const first = panel.current && panel.current.querySelector('.menu-item');
    if (first) first.focus({ preventScroll: true });
  }, []);

  return (
    <div className="menu-wrap" role="dialog" aria-modal="true" aria-label="Menu" onClick={onClose}>
      <nav className="menu" ref={panel} onClick={(e) => e.stopPropagation()}>
        <div className="menu-head">
          <button className="circle" type="button" aria-label="Fermer le menu" onClick={onClose}><Ic d={I.close} /></button>
          <div className="logo"><b>Le Carnet</b><small>Montréal · testé à deux</small></div>
          <span style={{ width: 44 }} />
        </div>
        <div className="menu-body">
          {sections.filter((s) => s.items.length).map((s) => (
            <section key={s.title} className="menu-sec">
              <h2 className="lbl">{s.title}</h2>
              <ul>
                {s.items.map((it) => (
                  <li key={it.key}>
                    <button type="button" className={'menu-item' + (it.active ? ' active' : '')} aria-current={it.active ? 'page' : undefined}
                      onClick={() => { onClose(); it.onClick(); }}>
                      <span className="menu-ic"><Ic d={it.icon} size={22} /></span>
                      <span className="menu-txt">
                        <b>{it.label}{it.lock && <span className="menu-lock" title="Réservé à Matthieu et Azéline"><Ic d={I.lock} size={13} sw={2.4} /></span>}</b>
                        {it.sub && <small>{it.sub}</small>}
                      </span>
                      {it.badge != null && <span className="menu-badge">{it.badge}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {footer && <div className="menu-foot">{footer}</div>}
        </div>
      </nav>
    </div>
  );
}
