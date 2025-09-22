// soundManager.js
import { Howl } from "howler";
import sendSoundFile from "../assets/sounds/send.mp3";
import receiveSoundFile from "../assets/sounds/receive.mp3";

const sendSound = new Howl({
  src: [sendSoundFile],
  preload: true,
  html5: true,
});

const receiveSound = new Howl({
  src: [receiveSoundFile],
  preload: true,
  html5: true,
});

// ✅ localStorage に保存されている設定を見て判断
const isSoundEnabled = () => {
  return JSON.parse(localStorage.getItem("sound_enabled") || "true");
};

// ✅ 再生関数：ONのときだけ再生
export const playSendSound = () => {
  if (isSoundEnabled()) sendSound.play();
};

export const playReceiveSound = () => {
  if (isSoundEnabled()) {
    receiveSound.play();
    console.log("[♪] 通知音");
  }
};
