/* global window, document */

function once(el, eventName, handler, options) {
  const wrapped = (event) => {
    el.removeEventListener(eventName, wrapped, options);
    handler(event);
  };
  el.addEventListener(eventName, wrapped, options);
}

function setBodyClass(className, enabled) {
  document.body.classList.toggle(className, Boolean(enabled));
}

async function safePlay(videoEl) {
  try {
    // play() can return undefined in very old browsers, but modern ones return a Promise.
    await videoEl.play();
    return true;
  } catch {
    return false;
  }
}

function show(el, shouldShow) {
  el.hidden = !shouldShow;
}

function removePosterAfterFade(posterEl) {
  if (!posterEl) return;

  // If transitions are disabled, remove immediately.
  const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion) {
    posterEl.remove();
    return;
  }

  once(
    posterEl,
    "transitionend",
    (e) => {
      if (e.propertyName === "opacity") posterEl.remove();
    },
    { passive: true }
  );

  // Safety: remove even if transitionend never fires.
  window.setTimeout(() => {
    if (document.body.contains(posterEl)) posterEl.remove();
  }, 1200);
}

async function init() {
  const video = document.getElementById("bgVideo");
  const poster = document.getElementById("poster");
  const soundButton = document.getElementById("soundButton");

  if (!(video instanceof HTMLVideoElement) || !(soundButton instanceof HTMLElement)) {
    return;
  }

  // Make sure the browser actually loads the media (some browsers are conservative
  // when opening via file://).
  video.preload = "auto";
  video.load();

  // Fade poster as soon as we have the first frame ready.
  if (poster instanceof HTMLElement) {
    once(video, "loadeddata", () => {
      setBodyClass("video-ready", true);
      removePosterAfterFade(poster);
    });
  } else {
    once(video, "loadeddata", () => setBodyClass("video-ready", true));
  }

  function updateButton() {
    if (video.paused) {
      soundButton.textContent = "Tap to play";
      show(soundButton, true);
      return;
    }

    if (video.muted) {
      soundButton.textContent = "Tap for sound";
      show(soundButton, true);
      return;
    }

    show(soundButton, false);
  }

  // Reliable autoplay path: start muted.
  video.muted = true;
  // Some Safari versions are picky about the *attribute* existing for autoplay.
  video.setAttribute("muted", "");

  const startedMuted = await safePlay(video);
  if (!startedMuted) {
    // Autoplay can still be blocked (user settings, etc.). We’ll ask for a tap.
    updateButton();
  } else {
    updateButton();
  }

  video.addEventListener("play", updateButton, { passive: true });
  video.addEventListener("pause", updateButton, { passive: true });
  video.addEventListener("volumechange", updateButton, { passive: true });

  soundButton.addEventListener(
    "click",
    async () => {
      // User gesture: start playback if needed, then unmute for audio.
      if (video.paused) await safePlay(video);
      if (video.muted) {
        video.muted = false;
        // Some browsers require another play() to kick audio after unmuting.
        await safePlay(video);
      }
      updateButton();
    },
    { passive: true }
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { passive: true });
} else {
  init();
}

