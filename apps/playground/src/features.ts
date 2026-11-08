export const isExperimentalEnabled = (): boolean => {
  const params = new URLSearchParams(window.location.search);
  const value = params.get("experimental");

  if (value !== null) {
    return ["1", "true", "yes", "on"].includes(value.toLowerCase());
  }

  try {
    return localStorage.getItem("synth8.experimental") === "true";
  } catch {
    return false;
  }
};
