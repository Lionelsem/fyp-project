import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import PageLayout from "./PageLayout";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])'
].join(",");

const PortalShell = ({
  pageTitle,
  profile,
  NavbarComponent,
  SidebarComponent,
  shellClassName = "",
  contentClassName = "",
  children
}) => {
  const location = useLocation();
  const generatedId = useId();
  const drawerId = `portal-navigation-${generatedId.replace(/:/g, "")}`;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const sidebarRef = useRef(null);
  const mainContentRef = useRef(null);
  const wasMenuOpenRef = useRef(false);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const toggleMenu = useCallback(() => {
    setIsMenuOpen((isOpen) => !isOpen);
  }, []);

  useEffect(() => {
    closeMenu();
  }, [closeMenu, location.hash, location.pathname, location.search]);

  useEffect(() => {
    const mainContent = mainContentRef.current;
    if (!mainContent) return;

    mainContent.scrollTop = 0;
    mainContent.scrollLeft = 0;
  }, [location.pathname]);

  useEffect(() => {
    const wasMenuOpen = wasMenuOpenRef.current;
    wasMenuOpenRef.current = isMenuOpen;

    if (wasMenuOpen && !isMenuOpen) {
      menuButtonRef.current?.focus();
    }
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("portal-drawer-open");

    const drawer = sidebarRef.current;
    const getFocusableElements = () =>
      drawer ? Array.from(drawer.querySelectorAll(focusableSelector)) : [];

    getFocusableElements()[0]?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.classList.remove("portal-drawer-open");
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMenu, isMenuOpen]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return undefined;
    }

    const mobileQuery = window.matchMedia("(max-width: 960px)");
    const handleViewportChange = (event) => {
      if (!event.matches) {
        closeMenu();
      }
    };

    if (typeof mobileQuery.addEventListener === "function") {
      mobileQuery.addEventListener("change", handleViewportChange);
    } else {
      mobileQuery.addListener?.(handleViewportChange);
    }

    return () => {
      if (typeof mobileQuery.removeEventListener === "function") {
        mobileQuery.removeEventListener("change", handleViewportChange);
      } else {
        mobileQuery.removeListener?.(handleViewportChange);
      }
    };
  }, [closeMenu]);

  const shellClasses = [
    "app-shell",
    "portal-shell",
    shellClassName,
    isMenuOpen ? "portal-shell--drawer-open" : ""
  ]
    .filter(Boolean)
    .join(" ");
  const mainContentClasses = ["main-content", contentClassName]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClasses}>
      <div className="app-body portal-shell__body">
        <div
          id={drawerId}
          ref={sidebarRef}
          className="portal-sidebar-drawer"
          aria-label={isMenuOpen ? "Primary navigation" : undefined}
          aria-modal={isMenuOpen ? "true" : undefined}
          role={isMenuOpen ? "dialog" : undefined}
        >
          <SidebarComponent
            profile={profile}
            onClose={closeMenu}
            onNavigate={closeMenu}
          />
        </div>

        <button
          type="button"
          className="portal-sidebar-backdrop"
          aria-label="Close navigation menu"
          onClick={closeMenu}
          tabIndex={isMenuOpen ? 0 : -1}
        />

        <div className="app-main portal-shell__main">
          <NavbarComponent
            pageTitle={pageTitle}
            isMenuOpen={isMenuOpen}
            menuButtonRef={menuButtonRef}
            menuControlsId={drawerId}
            onMenuToggle={toggleMenu}
          />
          <main ref={mainContentRef} className={mainContentClasses}>
            <PageLayout className="portal-page-layout">{children}</PageLayout>
          </main>
        </div>
      </div>
    </div>
  );
};

export default PortalShell;
