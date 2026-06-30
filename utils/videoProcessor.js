import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Vercel serverless 只能写 /tmp，本地用项目 tmp 目录
const TMP_DIR = process.env.VERCEL ? '/tmp' : path.join(__dirname, '..', 'tmp');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

// ===== ffmpeg 路径自动检测（懒加载，避免阻塞 server 启动）=====
let FFMPEG_PATH = process.env.FFMPEG_PATH || '';
let FFPROBE_PATH = process.env.FFPROBE_PATH || '';
let ffmpegPathsPromise = null;

async function ensureFfmpegPaths() {
  if (ffmpegPathsPromise) return ffmpegPathsPromise;
  ffmpegPathsPromise = (async () => {
    try {
      const ffmpegInstaller = await import('@ffmpeg-installer/ffmpeg');
      const fPath = ffmpegInstaller?.default?.path || ffmpegInstaller?.path;
      if (fPath) FFMPEG_PATH = fPath;
    } catch {}
    try {
      const ffprobeInstaller = await import('@ffprobe-installer/ffprobe');
      if (ffprobeInstaller?.path) FFPROBE_PATH = ffprobeInstaller.path;
    } catch {}
    FFMPEG_PATH = process.env.FFMPEG_PATH || FFMPEG_PATH || '';
    FFPROBE_PATH = process.env.FFPROBE_PATH || FFPROBE_PATH || '';
  })();
  return ffmpegPathsPromise;
}

function checkFfmpeg() {
  // 依次检测：npm 安装版 → 环境变量/硬编码路径 → 系统 PATH
  const candidates = [FFMPEG_PATH, 'ffmpeg'].filter(Boolean);
  for (const cmd of candidates) {
    try {
      execSync(`${cmd.includes(' ') || cmd.includes('/') ? `"${cmd}"` : cmd} -version`, { stdio: 'pipe', timeout: 5000 });
      console.log(`✓ ffmpeg 可用: ${cmd}`);
      return true;
    } catch { continue; }
  }
  console.log('⚠️ ffmpeg 不可用（视频分析将使用纯文本模式）');
  return false;
}

function getFfmpegCmd() {
  // 返回当前可用的 ffmpeg 命令
  if (FFMPEG_PATH) return FFMPEG_PATH;
  return 'ffmpeg';
}

function runFfmpeg(args, timeout = 120000) {
  const exe = getFfmpegCmd();
  const cmd = exe.includes(' ') || exe.includes('/') ? `"${exe}" ${args}` : `${exe} ${args}`;
  try {
    execSync(cmd, { timeout, stdio: 'pipe' });
    return true;
  } catch {
    // 降级到系统 PATH
    try {
      execSync(`ffmpeg ${args}`, { timeout, stdio: 'pipe' });
      return true;
    } catch (e) {
      return false;
    }
  }
}

function runFfmpegCapture(args, timeout = 10000, useFfprobe = false) {
  const exe = useFfprobe ? FFPROBE_PATH : getFfmpegCmd();
  const cmd = exe.includes(' ') || exe.includes('/') ? `"${exe}" ${args}` : `${exe} ${args}`;
  try {
    return execSync(cmd, { timeout, stdio: 'pipe' }).toString().trim();
  } catch {
    const fallback = useFfprobe ? 'ffprobe' : 'ffmpeg';
    try {
      return execSync(`${fallback} ${args}`, { timeout, stdio: 'pipe' }).toString().trim();
    } catch {
      return '';
    }
  }
}

// 从 SSR 数据中提取视频 URL
function extractVideoUrl(ssrData) {
  if (!ssrData) return null;
  try {
    const note = ssrData.note?.noteDetailMap?.[Object.keys(ssrData.note?.noteDetailMap || {})[0]]?.note;
    if (!note) return null;
    if (note.type !== 'video') return null;
    const video = note.video?.media?.stream || note.video?.consumer?.originVideoKey;
    if (note.video?.media?.stream?.h264?.[0]?.masterUrl) {
      return note.video.media.stream.h264[0].masterUrl;
    }
    if (note.video?.media?.stream?.h265?.[0]?.masterUrl) {
      return note.video.media.stream.h265[0].masterUrl;
    }
    if (note.video?.consumer?.originVideoKey) {
      return `https://sns-video-bd.xhscdn.com/${note.video.consumer.originVideoKey}`;
    }
    // 尝试从 video list 获取
    const videoList = note.video?.media?.videoList;
    if (videoList && videoList.length > 0) {
      return videoList[0].media?.stream?.h264?.[0]?.masterUrl || videoList[0].url;
    }
    return null;
  } catch {
    return null;
  }
}

// 下载视频
async function downloadVideo(videoUrl, noteId) {
  const videoPath = path.join(TMP_DIR, `${noteId}.mp4`);
  const audioPath = path.join(TMP_DIR, `${noteId}.mp3`);

  // 尝试用 ffmpeg 直接下载
  const dlOk = runFfmpeg(`-y -i "${videoUrl}" -c copy "${videoPath}"`, 60000);
  if (!dlOk || !fs.existsSync(videoPath) || fs.statSync(videoPath).size < 1000) {
    // 降级：用 fetch 下载
    try {
      const res = await fetch(videoUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.xiaohongshu.com/',
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(videoPath, buffer);
    } catch (e) {
      throw new Error('视频下载失败：' + e.message);
    }
  }

  if (!fs.existsSync(videoPath) || fs.statSync(videoPath).size < 1000) {
    throw new Error('视频文件无效');
  }

  return { videoPath, audioPath };
}

// 提取音频
function extractAudio(videoPath, audioPath) {
  const mp3Ok = runFfmpeg(`-y -i "${videoPath}" -vn -acodec libmp3lame -q:a 4 "${audioPath}"`);
  if (mp3Ok && fs.existsSync(audioPath) && fs.statSync(audioPath).size > 1000) {
    return audioPath;
  }

  // 降级：提取为 wav
  const wavPath = audioPath.replace('.mp3', '.wav');
  const wavOk = runFfmpeg(`-y -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${wavPath}"`);
  if (wavOk && fs.existsSync(wavPath) && fs.statSync(wavPath).size > 1000) {
    return wavPath;
  }

  throw new Error('音频提取失败');
}

// 提取关键帧
function extractKeyframes(videoPath, noteId, maxFrames = 6) {
  const frameDir = path.join(TMP_DIR, `${noteId}_frames`);
  if (!fs.existsSync(frameDir)) fs.mkdirSync(frameDir, { recursive: true });

  const frames = [];
  // 获取视频时长
  const probeOutput = runFfmpegCapture(`-v quiet -show_entries format=duration -of csv=p=0 "${videoPath}"`, 10000, true);
  const duration = parseFloat(probeOutput);
  if (isNaN(duration) || duration <= 0) {
    // 降级：从第1秒开始每秒取一帧
    for (let i = 1; i <= maxFrames; i++) {
      const framePath = path.join(frameDir, `frame_${i}.jpg`);
      const ok = runFfmpeg(`-y -ss ${i} -i "${videoPath}" -vframes 1 -q:v 2 "${framePath}"`, 15000);
      if (ok && fs.existsSync(framePath) && fs.statSync(framePath).size > 1000) {
        frames.push({ path: framePath, timestamp: i });
      }
    }
    return frames;
  }

  // 均匀分布提取关键帧
  const interval = duration / (maxFrames + 1);
  for (let i = 1; i <= maxFrames; i++) {
    const timestamp = (interval * i).toFixed(2);
    const framePath = path.join(frameDir, `frame_${i}.jpg`);
    const ok = runFfmpeg(`-y -ss ${timestamp} -i "${videoPath}" -vframes 1 -q:v 2 "${framePath}"`, 15000);
    if (ok && fs.existsSync(framePath) && fs.statSync(framePath).size > 1000) {
      frames.push({ path: framePath, timestamp: parseFloat(timestamp) });
    }
  }

  return frames;
}

// 清理临时文件
function cleanup(noteId) {
  const files = [
    path.join(TMP_DIR, `${noteId}.mp4`),
    path.join(TMP_DIR, `${noteId}.mp3`),
    path.join(TMP_DIR, `${noteId}.wav`),
  ];
  files.forEach(f => { try { fs.unlinkSync(f); } catch {} });

  const frameDir = path.join(TMP_DIR, `${noteId}_frames`);
  try {
    if (fs.existsSync(frameDir)) {
      fs.readdirSync(frameDir).forEach(f => { try { fs.unlinkSync(path.join(frameDir, f)); } catch {} });
      fs.rmdirSync(frameDir);
    }
  } catch {}
}

// 将音频文件转为 base64
function audioToBase64(audioPath) {
  const buffer = fs.readFileSync(audioPath);
  const ext = path.extname(audioPath).slice(1);
  const mime = ext === 'wav' ? 'audio/wav' : 'audio/mpeg';
  return { base64: buffer.toString('base64'), mime };
}

// 将图片文件转为 base64
function imageToBase64(imagePath) {
  const buffer = fs.readFileSync(imagePath);
  return buffer.toString('base64');
}

export {
  checkFfmpeg,
  ensureFfmpegPaths,
  extractVideoUrl,
  downloadVideo,
  extractAudio,
  extractKeyframes,
  cleanup,
  audioToBase64,
  imageToBase64,
  TMP_DIR,
};
