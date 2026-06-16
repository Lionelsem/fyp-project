const REMEMBERED_LOGIN_KEY = "cbreFsmRememberedLogin";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const getRememberedEmail = () => {
  try {
    const storedValue = window.localStorage.getItem(REMEMBERED_LOGIN_KEY);

    if (!storedValue) {
      return "";
    }

    const rememberedLogin = JSON.parse(storedValue);
    const isExpired =
      !rememberedLogin?.expiresAt || Date.now() > rememberedLogin.expiresAt;

    if (isExpired) {
      clearRememberedEmail();
      return "";
    }

    return rememberedLogin.email || "";
  } catch (error) {
    clearRememberedEmail();
    return "";
  }
};

export const saveRememberedEmail = (email) => {
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    clearRememberedEmail();
    return;
  }

  window.localStorage.setItem(
    REMEMBERED_LOGIN_KEY,
    JSON.stringify({
      email: trimmedEmail,
      expiresAt: Date.now() + THIRTY_DAYS_MS
    })
  );
};

export const clearRememberedEmail = () => {
  window.localStorage.removeItem(REMEMBERED_LOGIN_KEY);
};
