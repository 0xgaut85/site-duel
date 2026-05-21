"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

/*
 * Global footer for the carousel — sits fixed at the bottom of the
 * viewport on every frame. Two text rails:
 *
 *   ┌─ © DUEL AGENTS 2026 ─────────────── PRIVACY · LEGAL ─┐
 *
 * Clicking either link on the right opens a modal panel that overlays
 * the carousel with tailored Duel Agents copy. Closing the modal
 * returns focus to the link that opened it.
 *
 * The footer text uses `mix-blend-mode: difference` so a single colour
 * value reads correctly across the landing's paper ground, the dark
 * InfoFrame imagery, and the AccessFrame's photograph — same trick
 * used for the InfoFrame crosshair dividers.
 */

type Doc = "privacy" | "legal" | null;

export function Footer() {
  const [open, setOpen] = useState<Doc>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const lastTriggeredBy = useRef<HTMLButtonElement | null>(null);

  const openDoc = useCallback((kind: Exclude<Doc, null>) => {
    return (e: React.MouseEvent<HTMLButtonElement>) => {
      lastTriggeredBy.current = e.currentTarget;
      setOpen(kind);
    };
  }, []);

  const close = useCallback(() => {
    setOpen(null);
    // Restore focus to whichever link opened the modal.
    requestAnimationFrame(() => {
      lastTriggeredBy.current?.focus();
    });
  }, []);

  // ESC closes the modal.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <>
      <footer
        data-site-footer=""
        className="fixed inset-x-0 bottom-0 z-50 pointer-events-none max-md:relative max-md:z-10"
        aria-label="Site footer"
      >
        <div
          className="flex items-center justify-between gap-6"
          style={{
            paddingLeft: "var(--frame-padding)",
            paddingRight: "var(--frame-padding)",
            paddingBottom: "clamp(0.85rem, 1.4vw, 1.25rem)",
            paddingTop: "clamp(0.85rem, 1.4vw, 1.25rem)",
            // `difference` blend mode lets one colour read across any
            // ground (light paper, dark image, deep ink).
            mixBlendMode: "difference",
            color: "rgba(220,220,220,0.9)",
          }}
        >
          <span
            className="font-mono pointer-events-auto select-none"
            style={{
              fontSize: "clamp(10px, 0.8vw, 11.5px)",
              letterSpacing: "0.28em",
            }}
          >
            © DUEL AGENTS 2026
          </span>
          <div
            className="flex items-center gap-5 pointer-events-auto"
            style={{
              fontSize: "clamp(10px, 0.8vw, 11.5px)",
              letterSpacing: "0.28em",
            }}
          >
            <button
              ref={triggerRef}
              type="button"
              onClick={openDoc("privacy")}
              className="font-mono transition-opacity hover:opacity-100 opacity-80 cursor-pointer"
            >
              PRIVACY
            </button>
            <span aria-hidden="true" className="font-mono opacity-50">
              ·
            </span>
            <button
              type="button"
              onClick={openDoc("legal")}
              className="font-mono transition-opacity hover:opacity-100 opacity-80 cursor-pointer"
            >
              LEGAL
            </button>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {open && <DocModal kind={open} onClose={close} />}
      </AnimatePresence>
    </>
  );
}

/* ─────────────────────────────────────────────── modal */

interface DocModalProps {
  kind: Exclude<Doc, null>;
  onClose: () => void;
}

function DocModal({ kind, onClose }: DocModalProps) {
  const content = kind === "privacy" ? PRIVACY : LEGAL;
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  // Auto-focus the close button on open so the modal is keyboard
  // navigable immediately.
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <motion.div
      data-legal-modal=""
      className="fixed inset-0 z-[180] flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.19, 1, 0.22, 1] }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="doc-modal-title"
    >
      {/* Backdrop — clicking outside closes. */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        style={{
          background: "rgba(8,8,8,0.62)",
          backdropFilter: "blur(8px) saturate(120%)",
          WebkitBackdropFilter: "blur(8px) saturate(120%)",
        }}
      />

      {/* Panel. */}
      <motion.div
        ref={panelRef}
        data-legal-modal-panel=""
        initial={{ y: 14, scale: 0.985, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 10, scale: 0.99, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
        className="relative w-[min(620px,92vw)] max-h-[82vh] flex flex-col overflow-hidden"
        style={{
          background: "var(--paper)",
          color: "var(--ink)",
          boxShadow:
            "0 30px 80px -32px rgba(0,0,0,0.45), 0 8px 20px -8px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(10,10,10,0.08)",
        }}
      >
        {/* Header rail */}
        <div
          className="flex items-center justify-between gap-6 border-b border-ink/10"
          style={{
            paddingLeft: "clamp(1.25rem, 2.4vw, 2rem)",
            paddingRight: "clamp(1.25rem, 2.4vw, 2rem)",
            paddingTop: "clamp(1rem, 1.8vw, 1.4rem)",
            paddingBottom: "clamp(1rem, 1.8vw, 1.4rem)",
          }}
        >
          <span
            className="font-mono text-ink-faint"
            style={{
              fontSize: "clamp(10px, 0.8vw, 11.5px)",
              letterSpacing: "0.28em",
            }}
          >
            / DUEL AGENTS · {kind.toUpperCase()}
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="font-mono text-ink-faint hover:text-ink transition-colors"
            style={{
              fontSize: "clamp(10px, 0.8vw, 11.5px)",
              letterSpacing: "0.28em",
            }}
          >
            × CLOSE
          </button>
        </div>

        {/* Body — scrollable. */}
        <div
          className="flex-1 min-h-0 overflow-y-auto"
          style={{
            padding: "clamp(1.5rem, 2.6vw, 2.4rem)",
          }}
        >
          <h2
            id="doc-modal-title"
            className="font-display font-medium text-ink"
            style={{
              fontSize: "clamp(1.5rem, 2.6vw, 2.2rem)",
              letterSpacing: "-0.022em",
              lineHeight: 1.04,
            }}
          >
            {content.title}
          </h2>
          <p
            className="font-mono text-ink-faint mt-2"
            style={{
              fontSize: "clamp(10px, 0.8vw, 11.5px)",
              letterSpacing: "0.22em",
            }}
          >
            UPDATED {content.updated}
          </p>

          <div
            className="mt-7 flex flex-col gap-6 text-ink-soft"
            style={{
              fontSize: "clamp(14px, 1.05vw, 15.5px)",
              lineHeight: 1.6,
            }}
          >
            {content.sections.map((s) => (
              <section key={s.heading}>
                <h3
                  className="font-mono text-ink"
                  style={{
                    fontSize: "clamp(10.5px, 0.85vw, 12px)",
                    letterSpacing: "0.24em",
                    marginBottom: "0.55rem",
                  }}
                >
                  / {s.heading.toUpperCase()}
                </h3>
                {s.body.map((para, i) => (
                  <p key={i} className={i === 0 ? "" : "mt-3"}>
                    {para}
                  </p>
                ))}
              </section>
            ))}
          </div>

          <p
            className="mt-10 font-mono text-ink-faint"
            style={{
              fontSize: "clamp(10px, 0.8vw, 11.5px)",
              letterSpacing: "0.22em",
            }}
          >
            QUESTIONS? <a href="mailto:hello@duel-agents.com" className="text-ink hover:text-ink-soft underline-offset-4 hover:underline">HELLO@DUEL-AGENTS.COM</a>
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────── copy
 *
 * Generic, template-style policy text. Intentionally close to the
 * standard boilerplate users expect to see — section headings and
 * order follow the conventional Privacy Policy / Terms of Service
 * layout so visitors can scan it the way they scan every other one.
 */

const PRIVACY = {
  title: "Privacy Policy",
  updated: "MAY 2026",
  sections: [
    {
      heading: "Introduction",
      body: [
        "Duel Agents (\"we\", \"us\", \"our\") is committed to protecting the privacy of visitors to this website and users of our services. This Privacy Policy explains what information we collect, how we use it, and the choices available to you regarding your personal data.",
        "By accessing this website or submitting information through it, you acknowledge that you have read and understood the practices described below.",
      ],
    },
    {
      heading: "Information we collect",
      body: [
        "We collect information that you voluntarily provide to us, such as your email address when you join our waiting list or contact us. We may also collect limited technical information automatically when you visit the site, including your IP address, browser type, device identifiers, and the pages you view.",
      ],
    },
    {
      heading: "How we use your information",
      body: [
        "We use the information we collect to communicate with you about our products and services, to operate and improve our website, to comply with our legal obligations, and to detect, prevent, and respond to fraud or abuse.",
      ],
    },
    {
      heading: "Sharing and disclosure",
      body: [
        "We do not sell your personal information. We may share information with service providers who process data on our behalf (such as hosting, email delivery, and analytics providers), with our affiliates and professional advisers, or where required to comply with applicable law, legal process, or enforceable governmental request.",
      ],
    },
    {
      heading: "Data retention",
      body: [
        "We retain personal information for as long as necessary to fulfil the purposes for which it was collected, or for a longer period if required by law. When personal information is no longer required, we will delete or anonymise it.",
      ],
    },
    {
      heading: "Your rights",
      body: [
        "Depending on your jurisdiction, you may have the right to access, correct, delete, or restrict the processing of your personal information, and to object to processing or request data portability. To exercise any of these rights, please contact us at the address below.",
      ],
    },
    {
      heading: "Cookies and similar technologies",
      body: [
        "Our website may use cookies and similar technologies to operate the site, remember your preferences, and measure traffic. You can control cookies through your browser settings; disabling them may affect certain features of the site.",
      ],
    },
    {
      heading: "Changes to this policy",
      body: [
        "We may update this Privacy Policy from time to time. The latest version will always be available on this page, and the \"Updated\" date above will reflect the date of the most recent revision.",
      ],
    },
    {
      heading: "Contact",
      body: [
        "If you have any questions or requests regarding this Privacy Policy or our handling of your personal information, please contact us at hello@duel-agents.com.",
      ],
    },
  ],
};

const LEGAL = {
  title: "Terms of Service",
  updated: "MAY 2026",
  sections: [
    {
      heading: "Acceptance of terms",
      body: [
        "These Terms of Service (\"Terms\") govern your access to and use of the Duel Agents website and any related services (collectively, the \"Services\"). By accessing or using the Services, you agree to be bound by these Terms. If you do not agree, do not use the Services.",
      ],
    },
    {
      heading: "Use of the services",
      body: [
        "You agree to use the Services only for lawful purposes and in accordance with these Terms. You may not use the Services in any manner that could damage, disable, overburden, or impair them, or interfere with any other party's use of the Services.",
      ],
    },
    {
      heading: "Intellectual property",
      body: [
        "All content, trademarks, logos, and other materials made available through the Services are the property of Duel Agents or its licensors and are protected by applicable intellectual property laws. You are granted a limited, non-exclusive, non-transferable licence to access and use the Services for your personal or internal business use.",
      ],
    },
    {
      heading: "Disclaimer",
      body: [
        "The Services are provided on an \"as is\" and \"as available\" basis without warranties of any kind, whether express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the Services will be uninterrupted, secure, or error-free.",
      ],
    },
    {
      heading: "Limitation of liability",
      body: [
        "To the maximum extent permitted by law, in no event shall Duel Agents, its directors, employees, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or relating to your use of, or inability to use, the Services.",
      ],
    },
    {
      heading: "Indemnification",
      body: [
        "You agree to indemnify and hold harmless Duel Agents and its affiliates from any claims, damages, losses, liabilities, and expenses (including reasonable legal fees) arising out of or related to your use of the Services or your breach of these Terms.",
      ],
    },
    {
      heading: "Modifications",
      body: [
        "We may modify these Terms from time to time. The updated Terms will be posted on this page with a revised \"Updated\" date. Your continued use of the Services after any such changes constitutes your acceptance of the revised Terms.",
      ],
    },
    {
      heading: "Governing law",
      body: [
        "These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Duel Agents is established, without regard to its conflict-of-laws principles. Any disputes arising hereunder shall be subject to the exclusive jurisdiction of the competent courts of that jurisdiction.",
      ],
    },
    {
      heading: "Contact",
      body: [
        "For any questions regarding these Terms, please contact us at hello@duel-agents.com.",
      ],
    },
  ],
};
