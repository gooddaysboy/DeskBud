// ✰ webmeji ✰
// little creatures that walk around your website =w=b
// inspired by shimeji, put together by Lars de Rooij
// not affiliated with any other shimeji projects
// last updated: 27 january 2026
// homepage: webmeji.neocities.org

// this is likely very unoptimized and quite messy code, i apologize for that. plain info on each function is at the bottom of the readme
// this project was made with the intention that changing anything in the config.js would be easy. this is not that. modifying this comes at your own risk.

/* DeskBud 帧缓存 ---------------------------------------------------------
   原实现：预载用 new Image() 但不持有引用，之后每帧靠改 img.src 播放。
   线上资源头是 Cache-Control: public, max-age=0, must-revalidate（等于不缓存），
   于是每次切帧浏览器都要为这个 URL 发一次条件请求（跨境 RTT 几百 ms），
   而帧间隔只有 100ms → 帧永远切不过来 → 宠物定格成一个动作。
   解法：预载时把每帧 fetch 成 blob URL 常驻内存，并重写 config.frames。
   此后切帧走 blob:，永不触网，同时免疫缓存策略与弱网抖动。
------------------------------------------------------------------------ */
const FRAME_BLOBS = new Map();   // 原始 URL -> blob URL
const FRAME_INFLIGHT = new Map(); // 原始 URL -> 进行中的 fetch Promise（并发去重：逐动作预载时 stand/sit 共享帧源）
// 核心动作：语义参考（渐进路径已由"全量预载+逐动作就绪"覆盖）
const CORE_ACTIONS = ['walk', 'stand', 'drag', 'falling', 'fallen', 'climbSide'];

function actionFrames(config, action) {
  const item = config[action];
  return (item && Array.isArray(item.frames)) ? item.frames : [];
}

// 单帧 → blob URL（失败退回原 URL，绝不阻断整体；并发调用对同 URL 只发一次请求）
async function materializeFrame(src) {
  if (!src || src.startsWith('blob:')) return src;
  if (FRAME_BLOBS.has(src)) return FRAME_BLOBS.get(src);
  if (FRAME_INFLIGHT.has(src)) return FRAME_INFLIGHT.get(src);
  const p = (async () => {
    try {
      const res = await fetch(src, { cache: 'force-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const url = URL.createObjectURL(await res.blob());
      FRAME_BLOBS.set(src, url);
      return url;
    } catch (e) {
      console.warn('[webmeji] 帧加载失败，退回原 URL：', src, e && e.message);
      FRAME_BLOBS.set(src, src);
      return src;
    } finally {
      FRAME_INFLIGHT.delete(src);
    }
  })();
  FRAME_INFLIGHT.set(src, p);
  return p;
}

// 预载指定动作：各动作独立推进、完成一个立即标记 __ready（弱网下 walk 先好先播，不等整批）
async function preloadActions(config, actions) {
  if (!config.__ready) config.__ready = new Set();
  const todo = actions.filter(a => !config.__ready.has(a) && actionFrames(config, a).length);
  const CONC = 8;                       // 单动作内并发上限，避免一次打满连接
  const loadOne = async (a) => {
    const paths = [];
    actionFrames(config, a).forEach(f => {
      if (f && !f.startsWith('blob:') && !paths.includes(f)) paths.push(f);
    });
    for (let i = 0; i < paths.length; i += CONC) {
      await Promise.all(paths.slice(i, i + CONC).map(materializeFrame));
    }
    const item = config[a];
    if (item && Array.isArray(item.frames)) {
      item.frames = item.frames.map(f => FRAME_BLOBS.get(f) || f);
    }
    config.__ready.add(a);
  };
  await Promise.all(todo.map(loadOne));
}

window.addEventListener('DOMContentLoaded', () => {
  if (window.__WM_SPAWNED) return;      // 动态注入会重复派发，防重复生成
  window.__WM_SPAWNED = true;

  const configNames = [...new Set(window.SPAWNING.map(spawn => spawn.config))];
  const configs = configNames.map(name => window[name]).filter(Boolean);
  configs.forEach(c => { if (!c.__ready) c.__ready = new Set(); });

  const allActions = (cfg) => Object.keys(cfg).filter(k => {
    const v = cfg[k];
    return v && typeof v === 'object' && Array.isArray(v.frames);
  });

  // 超时兜底：网络再烂也最多等 CORE_TIMEOUT 就生成宠物（缺的帧走原 URL，由 img 自己加载）
  const withTimeout = (p, ms) => Promise.race([
    p, new Promise(r => setTimeout(() => { console.warn('[webmeji] 核心帧超时，先出宠物'); r(); }, ms))
  ]);
  const CORE_TIMEOUT = 8000;

  // 生成逻辑（按缺补生）：核心帧就绪 / 8s 兜底 / 切回前台补生，共用。
  // 谁没出生补谁——config 晚到（注入竞态）或单只构造失败不再永远少一只
  const spawnAll = (attempt) => {
    attempt = attempt || 0;
    if (!window.__WM_CREATURES) window.__WM_CREATURES = [];
    let missingCfg = false;
    window.SPAWNING.forEach(({ id, config }) => {
      if (window.__WM_CREATURES.some(c => c && c.img && c.img.id === id)) return;  // 已出生
      const cfg = window[config];
      if (!cfg) {
        missingCfg = true;
        if (attempt < 25) console.warn(`config 未就绪，稍后补生: ${config}`);
        return;
      }
      try {
        window.__WM_CREATURES.push(new Creature(id, cfg));
        console.log('[webmeji] 生成宠物:', id);
      } catch (e) { console.error('[webmeji] 生成失败：', e); }
    });
    // config 脚本晚到 → 定时重试补生（visibilitychange 也会再触发）
    if (missingCfg && attempt < 25) setTimeout(() => spawnAll(attempt + 1), 400);
  };

  // 0) 全量预载立即后台启动（逐动作标记：walk 帧拉完立刻标 walk，不等整批）
  //    CORE_ACTIONS 常量保留供语义参考，渐进路径已由"全量预载+逐动作就绪"覆盖
  Promise.all(configs.map(cfg => preloadActions(cfg, allActions(cfg))))
    .then(() => console.log('[webmeji] 全部帧就绪'));

  // 1) walk 或 stand 任一就绪 → 宠物即出（最快路径）；
  //    弱网下 8s 兜底强制出——此时若帧仍未就绪，Creature 进入"静帧站立"等待模式，绝不滑行
  const readyEither = (cfg) => new Promise(resolve => {
    if (cfg.__ready.has('walk') || cfg.__ready.has('stand')) return resolve();
    const poll = setInterval(() => {
      if (cfg.__ready.has('walk') || cfg.__ready.has('stand')) {
        clearInterval(poll); resolve();
      }
    }, 100);
  });
  Promise.all(configs.map(cfg => withTimeout(readyEither(cfg), CORE_TIMEOUT)))
    .catch(e => console.error('[webmeji] 核心帧加载异常：', e))
    .then(spawnAll);

  // 后台标签会把 setTimeout 节流到 1 分钟级，8s 兜底可能被拖很久 →
  // 切回前台时若宠物仍未生成（打开后立刻切走 + 弱网的组合），立即补生，不等定时器
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') spawnAll();
  });
});

// creature class -------------------------------------------------------
// 复合动作 → 其帧来源动作（这些动作自身无 frames 配置，就绪性跟着源动作走）
const ACTION_FRAME_ALIAS = { topwalk: 'walk', 'forced-walk': 'walk', 'force-think': 'forcethink' };

class Creature {
  constructor(containerId, spriteConfig) {
    this.currentEdge = 'bottom';

    // create div to hold the sprite image
    this.container = document.createElement('div');
    this.container.className = 'webmeji-container';
    document.body.appendChild(this.container);

    // create img element for first frame of sprite
    this.img = document.createElement('img');
    this.img.id = containerId;
    // DeskBud: 首帧优先用已 blob 化的帧——spawn 可能由 stand（2帧）先就绪触发，此时 walk
    // （28帧）尚未重写，赋原 URL 会造成 img+预载双发请求（本地 no-cache 下可见）
    const wf0 = spriteConfig.walk && spriteConfig.walk.frames[0];
    const sf0 = spriteConfig.stand && spriteConfig.stand.frames[0];
    const pickBlob = (a, b) => (a && a.startsWith('blob:')) ? a : b;
    this.img.src = pickBlob(wf0, pickBlob(sf0, wf0));
    this.container.appendChild(this.img);

    // store sprite configuration & randomize action sequence
    this.spriteConfig = spriteConfig;
    this.actionSequence = this.shuffle([...this.spriteConfig.ORIGINAL_ACTIONS]);
    this.currentActionIndex = 0;
    this.currentAction = null;
    this.frameTimer = null;          // interval for frame updates
    this.dragFrameTimer = null;      // interval for drag animation
    this.actionCompletionTimer = null; // timer for completing actions
    this.currentFrame = 0;
    this.direction = 1;              // movement direction, 1 = right, -1 = left
    this.facing = 'right';           // DeskBud: 素材面朝右(kotlin run)，初始按右基准镜像

    // starting states
    this.isDragging = false;
    this.isFalling = false;
    this.isPetting = false;
    this.isJumping = false;
    this.tripAfterFallActive = false;
    this.wasActionBeforePet = null; 

    // pointer / drag detection
    this.isPointerDown = false;
    window.addEventListener('mousedown', () => { this.isPointerDown = true; });
    window.addEventListener('mouseup', () => { this.isPointerDown = false; });
    window.addEventListener('touchstart', () => { this.isPointerDown = true; }, { passive: true });
    window.addEventListener('touchend', () => { this.isPointerDown = false; });

    // get container size
    const containerStyle = window.getComputedStyle(this.container);
    this.containerWidth = parseFloat(containerStyle.width);
    this.containerHeight = parseFloat(containerStyle.height);

    // spawn at random bottom position
    this.positionX = Math.random() * (window.innerWidth - this.containerWidth);
    this.positionY = window.innerHeight - this.containerHeight;

    this.container.style.left = `${this.positionX}px`;
    this.container.style.top = `${this.positionY}px`;

    this.maxPos = window.innerWidth - this.containerWidth; // max horizontal position
    this.forceWalkAfter = false; // flag for forcing walk after some actions
    this.forceThinkAfter = false;
    this.inverted = false;   // DeskBud: 顶部倒立行走时垂直翻转(头朝下脚朝上)

    this.container.style.left = `${this.positionX}px`;
    this.container.style.top = 'auto'; // reset top for CSS positioning
    this.baseBottom = 0; // reference for bottom alignment

    this.updateImageDirection(); // set initial facing

    // start first action（DeskBud: 帧未就绪时进入静帧站立等待，绝不带病上岗滑行）
    this.currentAction = null;
    this.bootIfReady();

    // bind animate to this object
    this.animate = this.animate.bind(this);
    this.animationFrameId = requestAnimationFrame(this.animate);

    // handle window resize to adjust max positions
    this.resizeHandler = () => {
      const style = window.getComputedStyle(this.container);
      this.containerWidth = parseFloat(style.width);
      this.containerHeight = parseFloat(style.height);
      this.maxPos = window.innerWidth - this.containerWidth;
      this.positionX = Math.min(this.positionX, this.maxPos);
      this.container.style.left = `${this.positionX}px`;
    };
    window.addEventListener('resize', this.resizeHandler);

    // enable mouse hover and drag interactions
    this.enablePetInteraction();
    this.enableDragInteraction();
  }

  // shuffle array for random action order
  shuffle(array) {
    for (let i=array.length-1; i>0; i--){
        const j = Math.floor(Math.random()*(i+1));
        [array[i],array[j]] = [array[j],array[i]]; // swap elements
    }
    return array;
  }

  // flip sprite horizontally depending on facing (+ vertical when inverted on top)
  updateImageDirection() {
    const base = this.facing === 'left' ? 'scaleX(1)' : 'scaleX(-1)';
    this.img.style.transform = this.inverted ? `${base} scaleY(-1)` : base;
  }

  // update facing from horizontal delta (dx)
  setFacingFromDelta(dx) {
    if (dx && !this.isDragging) {
        // DeskBud: 素材面朝右，向右走不镜像(面朝右)、向左走镜像(面朝左)
        this.facing = dx < 0 ? 'right' : 'left';
        this.updateImageDirection();
    }
  }

  // stop current animation timers
  resetAnimation() {
    clearInterval(this.frameTimer);
    clearTimeout(this.actionCompletionTimer);
    this.currentFrame = 0;
    this.frameTimer = null;
    this.actionCompletionTimer = null;
  }

  // cancel all timers and animation frames
  clearAllTimers() {
    this.resetAnimation();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // check if edge is left/right
  isSideEdge(edge) { return edge === 'left' || edge === 'right'; }
  // check if edge is anything except bottom
  isNonBottomEdge(edge) { return edge !== 'bottom'; }

  // update container class for current edge
  updateEdgeClass() {
      this.container.classList.remove('edge-left','edge-right','edge-top');
      if (!this.isDragging) {
          this.currentEdge === 'left' && this.container.classList.add('edge-left');
          this.currentEdge === 'right' && this.container.classList.add('edge-right');
          this.currentEdge === 'top' && this.container.classList.add('edge-top');
      }
      this.applyEdgeOffset(); // adjust position based on edge
  }

  // apply offsets when at edge to align sprite properly
  applyEdgeOffset() {
      if (this.isDragging) return this.container.style.cssText = `left:${this.positionX}px;top:${this.positionY}px`;

      // DeskBud: 素材为无道具纯动作(兔子占满画布居中、无墙/杆参照)，
      // 贴边 = 容器边缘对齐屏幕边缘即可(offset=0)。
      // 原 -width/2 等"半出屏"偏移是给带参照素材设计的，会把兔子裁掉半身(挂顶/侧边同源问题，均已归零)
      const offsetX = 0;
      const offsetY = 0;

      this.container.style.left = `${(this.positionX||0)+offsetX}px`;
      this.container.style.top  = `${(this.positionY||0)+offsetY}px`;
  }

  // jump to another edge (top, left, right)
  jumpToEdge(targetEdge) {
    if (this.isFalling || this.isPetting || this.isDragging || this.isJumping) return; // ignore if busy
    if (!this.isActionReady('walk')) return; // DeskBud: walk 帧未就绪禁跳（跳跃含随机水平位移，静帧等待期禁用）
    if (!this.spriteConfig.ALLOWANCES.includes(targetEdge)) return; // edge not allowed

    this.isJumping = true;
    this.resetAnimation();

    const jumpConfig = this.spriteConfig.jump;
    if (!jumpConfig) { this.isJumping = false; return; }

    const startX = this.positionX;
    const startY = this.positionY;
    let endX = startX;
    let endY = startY;

    switch (targetEdge) {
        case 'top':
            endY = 0;
            endX = Math.random() * (window.innerWidth - this.containerWidth); // random horizontal
            break;
        case 'left':
            endX = 0;
            endY = Math.random() * (window.innerHeight - this.containerHeight); // random vertical
            break;
        case 'right':
            endX = window.innerWidth - this.containerWidth;
            endY = Math.random() * (window.innerHeight - this.containerHeight); // random vertical
            break;
    }

    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.hypot(dx, dy); // calculate distance for speed

    if (distance === 0) { this.isJumping = false; return; }

    const duration = distance / this.spriteConfig.jumpspeed; // time to reach
    const startTime = performance.now();

    // setup frame animation for jump
    let frameIndex = 0;
    const totalFrames = jumpConfig.frames.length;
    this.img.src = jumpConfig.frames[frameIndex];

    const frameTimer = setInterval(() => {
        frameIndex = (frameIndex + 1) % totalFrames;
        this.img.src = jumpConfig.frames[frameIndex];
    }, jumpConfig.interval);

    // animation loop for jump movement
    const step = (time) => {
        if (this.isDragging) {
            clearInterval(frameTimer); 
            this.isJumping = false;    
            return;                    
        }

        const elapsed = (time - startTime) / 1000;
        const t = Math.min(elapsed / duration, 1); // progress 0-1

        this.positionX = startX + dx * t;
        this.positionY = startY + dy * t;

        if (dx !== 0) this.setFacingFromDelta(dx);

        this.container.style.left = `${this.positionX}px`;
        this.container.style.top = `${this.positionY}px`;

        if (t < 1) {
            requestAnimationFrame(step);
        } else {
            clearInterval(frameTimer);
            this.isJumping = false;
            this.currentEdge = targetEdge;
            // DeskBud: 侧边落地后强制设朝向(覆盖 step 里 setFacingFromDelta 的镜像结果), 攀爬脸朝屏外(扒着屏缘外侧)
            if (targetEdge === 'left') this.facing = 'right';         // 镜像 scaleX(-1) → 面朝左 → 朝屏外
            else if (targetEdge === 'right') this.facing = 'left';    // 不镜像 → 素材面朝右 → 朝屏外
            this.updateImageDirection();
            this.updateEdgeClass();
            this.startEdgeIdle(); // start idle after landing
        }
    };
    requestAnimationFrame(step);
  }

  // 边缘行为入口：side 抓稳后向上爬升到顶；top 挂住/倒立行走轮换(不掉落)
  startEdgeIdle() {
    this.updateEdgeClass();
    this.edgeAction();
  }

  // pick edge behavior by current edge (side => hang briefly then climb up; top => hang/topwalk)
  edgeAction() {
    if(this.isJumping||this.isFalling) return;
    if (this.isSideEdge(this.currentEdge)) {
      // DeskBud: 侧边被抓 → 先抓稳(短暂挂住)，结束时转 climbSide 向上爬升
      this.startAction('hangstillSide');
    } else if (this.currentEdge === 'top') {
      // DeskBud: 顶部(爬/跳到顶抵达) → 以倒立行走为主, 挂顶偶尔; 刚抵达不直接掉
      this.topDecide(false);
    }
  }

  // DeskBud: 顶边行为决策——主体为倒立行走(走远), 悬挂偶尔切换, 偶尔回落地面恢复日常动作
  // allowDrop=false(刚爬/跳到顶)时把"回落"并入悬挂, 不至于刚上来就掉
  topDecide(allowDrop) {
    if (this.isJumping || this.isFalling) return;
    if (this.currentEdge !== 'top') { this.setNextAction(); return; }
    const r = Math.random();
    if (r < 0.62) {                       // ~62% 继续/开始倒立行走 → 走得远
      if (this.currentAction === 'topwalk') this.continueTopwalk();
      else this.startAction('topwalk');
      return;
    }
    // 离开行走 → 先停行走帧, 再转挂顶或回落
    if (this.frameTimer) { clearInterval(this.frameTimer); this.frameTimer = null; }
    if (r < 0.85) this.startAction('hangstillTop');   // ~23% 偶尔挂顶摆动
    else if (allowDrop) this.fallToBottom();          // ~15% 偶尔回落地面(坐/想/蹦等日常)
    else this.startAction('hangstillTop');            // 刚抵达不落 → 并回悬挂
  }

  // DeskBud: 延续当前倒立行走(不重启帧序、方向多数保持), 一段到点再决策 → 走得远不碎切
  continueTopwalk() {
    if (this.actionCompletionTimer) { clearTimeout(this.actionCompletionTimer); this.actionCompletionTimer = null; }
    if (Math.random() < 0.3) this.direction *= -1;    // 偶发换向增变化, 多数直行
    const dur = 3000 + Math.random() * 3500;           // 每段 3~6.5s
    this.actionCompletionTimer = setTimeout(() => this.topDecide(true), dur);
  }

  // user interactions ---------------------------------------------------
  // petting animation when hovering
  enablePetInteraction() {
    if(!this.spriteConfig.ALLOWANCES?.includes('pet') || !this.spriteConfig.ALLOWANCES?.includes('bottom')) return;

    this.container.addEventListener('mouseenter',()=> {
        if(this.isFalling||this.isPointerDown||this.isPetting||this.isJumping||this.currentEdge!=='bottom') return;
        this.isPetting=true;
        this.wasActionBeforePet=this.currentAction;
        this.startPetAnimation();
    });
    this.container.addEventListener('mouseleave',()=> {
        if(this.isFalling||this.isPointerDown||this.isJumping||this.currentEdge==='top') return;
        this.isPetting=false;
        this.stopPetAnimation();
    });
  }

  // dragging animation and pointer tracking
  enableDragInteraction() {
    if (!this.spriteConfig.ALLOWANCES?.includes('drag')) return;
    if (!this.spriteConfig.ALLOWANCES?.includes('bottom')) return;

    let offsetX = 0;
    let offsetY = 0;

    const onPointerMove = (e) => {
        e.preventDefault();
        
        let clientX = e.clientX ?? e.touches?.[0].clientX;
        let clientY = e.clientY ?? e.touches?.[0].clientY;

        this.positionX = clientX - offsetX;
        this.positionY = clientY - offsetY;

        // clamp position to window
        this.positionX = Math.max(0, Math.min(this.positionX, window.innerWidth - this.containerWidth));
        this.positionY = Math.max(0, Math.min(this.positionY, window.innerHeight - this.containerHeight));

        this.container.style.left = this.positionX + 'px';
        this.container.style.top  = this.positionY + 'px';
    };

    const onPointerUp = () => {
        window.removeEventListener('mousemove', onPointerMove);
        window.removeEventListener('touchmove', onPointerMove);
        window.removeEventListener('mouseup', onPointerUp);
        window.removeEventListener('touchend', onPointerUp);

        this.isDragging = false;
        this.isFalling = false;

        this.resetAnimation();
        this.fallToBottom();

        this.animationFrameId = requestAnimationFrame(this.animate);
    };

    // listen to pointer down to start drag
    this.container.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.startDrag(e.clientX, e.clientY);
    });

    this.container.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        this.startDrag(touch.clientX, touch.clientY);
    });

    // actual drag logic
    this.startDrag = (clientX, clientY) => {
    this.resetAnimation();

    if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
    }

    this.isDragging = true;
    this.tripAfterFallActive = false;
    this.isJumping = false;
    this.isFalling = false;
    this.isPetting = false;
    this._pressStartTime = performance.now();   // DeskBud: 记录按下时刻，用于点击蓄力判断
    this._dragSamples = [];                      // DeskBud: 拖动轨迹样本(算松手甩动速度)

    this.currentAction = 'drag';
    this.img.style.transform = this.facing === 'left' ? 'scaleX(1)' : 'scaleX(-1)';

    if (this.dragFrameTimer) clearInterval(this.dragFrameTimer);

    const dragConfig = this.spriteConfig.drag;
    if (dragConfig?.frames?.length) {
        let frame = 0;
        this.img.src = dragConfig.frames[0];

        this.dragFrameTimer = setInterval(() => {
            frame = (frame + 1) % dragConfig.frames.length;
            this.img.src = dragConfig.frames[frame];
        }, dragConfig.interval);
    }

    const rect = this.container.getBoundingClientRect();
    let offsetX = clientX - rect.left;  // remember grab offset
    let offsetY = clientY - rect.top;
    const startClientX = clientX;
    const startClientY = clientY;
    let moved = false;   // DeskBud: 位移>8px 才算拖动，否则视为点击

    const onPointerMove = (e) => {
        e.preventDefault();
        
        let clientX = e.clientX ?? e.touches?.[0].clientX;
        let clientY = e.clientY ?? e.touches?.[0].clientY;

        if (!moved && Math.hypot(clientX - startClientX, clientY - startClientY) > 8) moved = true;

        this.positionX = clientX - offsetX;
        this.positionY = clientY - offsetY;

        // clamp to window
        this.positionX = Math.max(0, Math.min(this.positionX, window.innerWidth - this.containerWidth));
        this.positionY = Math.max(0, Math.min(this.positionY, window.innerHeight - this.containerHeight));

        this.container.style.left = this.positionX + 'px';
        this.container.style.top  = this.positionY + 'px';

        // DeskBud: 记录轨迹样本(保留最近 6 个, 丢弃 150ms 前的)
        const now = performance.now();
        this._dragSamples.push({ x: clientX, y: clientY, t: now });
        if (this._dragSamples.length > 6) this._dragSamples.shift();
        const cutoff = now - 150;
        while (this._dragSamples.length > 1 && this._dragSamples[0].t < cutoff) this._dragSamples.shift();
    };

    const onPointerUp = () => {
        window.removeEventListener('mousemove', onPointerMove);
        window.removeEventListener('touchmove', onPointerMove);
        window.removeEventListener('mouseup', onPointerUp);
        window.removeEventListener('touchend', onPointerUp);

        this.isDragging = false;
        this.isFalling = false;

        // stop drag animation
        if (this.dragFrameTimer) {
            clearInterval(this.dragFrameTimer);
            this.dragFrameTimer = null;
        }

        this.resetAnimation();

        // DeskBud: 甩动速度(末段 ~150ms 轨迹, px/s)
        let vx = 0, vy = 0;
        if (this._dragSamples && this._dragSamples.length >= 2) {
          const a = this._dragSamples[0];
          const b = this._dragSamples[this._dragSamples.length - 1];
          const dt = Math.max((b.t - a.t) / 1000, 0.001);
          vx = (b.x - a.x) / dt;
          vy = (b.y - a.y) / dt;
        }

        // DeskBud: 交互气泡（先于动作处理派发 —— 反应气泡优先级高于状态气泡，slip 等不会抢它）
        this.emitReact(moved ? 'drag' : 'click');

        if (!moved) {
          // DeskBud: 点击(未拖动)——挂顶/挂边则掉下；底部则长按蓄力蹦高
          if (this.currentEdge !== 'bottom') {
            this.fallToBottom();
          } else {
            // 长按蓄力：按住越久跳越高。快速点=半屏起，蓄满约 0.9s 接近屏幕顶部
            const holdMs = performance.now() - (this._pressStartTime || performance.now());
            const hold = Math.min(holdMs, 900) / 900;                 // 0 ~ 1
            const targetPeak = window.innerHeight * (0.45 - 0.33 * hold); // 顶点高度：半屏(0.45) → 近顶(0.12)
            const jumpHeight = (window.innerHeight - this.containerHeight) - targetPeak;
            this.bounce(Math.max(jumpHeight, 10));
          }
        } else {
          // DeskBud: 拖动/甩动松手——按"落点 + 220ms 惯性预估"决定抓哪条边 / 回底部
          const W = this.containerWidth, H = this.containerHeight;
          const iW = window.innerWidth, iH = window.innerHeight;
          const px = this.positionX + vx * 0.22;   // 惯性预估落点(甩动捕捉)
          const py = this.positionY + vy * 0.22;
          if (py <= H * 1.2) {
            // 拖/甩到顶部 → 先挂顶(玩家亲手挂上去), 挂完自动转顶边日常(倒走为主)
            this.positionY = 0;
            this.currentEdge = 'top';
            this.updateEdgeClass();
            this.startAction('hangstillTop');
          } else if (px <= W * 1.3) {
            // 拖/甩到左缘 → 抓边向上攀爬
            this.positionX = 0;
            this.currentEdge = 'left';
            this.facing = 'right';         // 贴左壁脸朝屏外(镜像 scaleX(-1), 素材面朝右→镜像后面朝左朝外)
            this.updateImageDirection();
            this.updateEdgeClass();
            this.startEdgeIdle();
          } else if (px >= iW - 2.3 * W) {
            // 拖/甩到右缘 → 抓边向上攀爬
            this.positionX = iW - W;
            this.currentEdge = 'right';
            this.facing = 'left';          // 贴右壁脸朝屏外(不镜像, 素材面朝右即朝外)
            this.updateImageDirection();
            this.updateEdgeClass();
            this.startEdgeIdle();
          } else {
            this.fallToBottom(); // 拖到屏幕中部 / 向下甩 → 回底部
          }
        }

        this.animationFrameId = requestAnimationFrame(this.animate);
    };

    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchend', onPointerUp);
  };
  }

  // DeskBud: 蹦跳(点击高蹦 / 底部自动低蹦)，到顶后重力下落
  bounce(height = 150) {
    if (this.isFalling || this.isDragging || this.isJumping || this.isPetting) return;
    if (this.currentEdge !== 'bottom') return;
    this.resetAnimation();
    this.isJumping = true;
    this.currentAction = 'bounce';

    const jumpConfig = this.spriteConfig.jump;
    const jumpHeight = height * (1.0 + Math.random() * 0.12); // 高度抖动(只增不减，保证"至少超半屏")
    const startY = this.positionY;
    const peakY = Math.max(0, startY - jumpHeight);
    const upDuration = 300 + (jumpHeight / window.innerHeight) * 350;  // 起跳耗时随高度延长，越高越慢

    let frameIndex = 0;
    // DeskBud: jump 帧未 blob 化时不换帧（避免原 URL img 直拉与后台预载重复），只做位移蹦跳
    if (jumpConfig && jumpConfig.frames && jumpConfig.frames.length && this.isActionReady('jump')) {
      this.img.src = jumpConfig.frames[0];
      this.frameTimer = setInterval(() => {
        frameIndex = (frameIndex + 1) % jumpConfig.frames.length;
        this.img.src = jumpConfig.frames[frameIndex];
      }, jumpConfig.interval || 160);
    }

    const startTime = performance.now();
    const step = (time) => {
      if (this.isDragging) {
        if (this.frameTimer) { clearInterval(this.frameTimer); this.frameTimer = null; }
        this.isJumping = false;
        return;
      }
      const elapsed = time - startTime;
      const t = Math.min(elapsed / upDuration, 1);
      const ease = 1 - Math.pow(1 - t, 2);   // easeOut 到顶减速
      this.positionY = startY - (startY - peakY) * ease;
      this.container.style.top = `${this.positionY}px`;
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        if (this.frameTimer) { clearInterval(this.frameTimer); this.frameTimer = null; }
        this.isJumping = false;
        this.currentAction = null;
        this.fallToBottom();   // 到顶后重力下落 → fallen 落地动画
      }
    };
    requestAnimationFrame(step);
  }

  // falling and recovery -------------------------------------------------
  // animate falling to bottom
  fallToBottom(fallSpeed=this.spriteConfig.fallspeed){
    if(this.isFalling) return;
    // DeskBud: 爬墙中途脱落（还在侧边、没爬到顶就掉）→ slip「脚脚打滑」，区别于普通坠落
    if (this.currentAction === 'climbSide' && this.isSideEdge(this.currentEdge)) this.emitAction('slip');
    this.tripAfterFallActive = false;
    this.isFalling = true;
    this.inverted = false;          // DeskBud: 落地复位(防倒立状态残留)
    this.updateImageDirection();
    this.currentEdge='bottom';
    this.updateEdgeClass();
    this.resetAnimation();

    const cfg=this.spriteConfig.falling; if(!cfg) return;

    let frameIndex=0;
    this.img.src=cfg.frames[0];
    // DeskBud: 下落动画只播一轮后停在末帧（持续下落姿态）。
    // ⚠️ 不循环：3 帧 × 120ms=360ms 一轮，长距离下落会循环 10+ 次，视觉上"忽闪忽闪"抽搐。
    let played=1;
    this.frameTimer=setInterval(()=>{
      if (played >= cfg.frames.length) { clearInterval(this.frameTimer); this.frameTimer=null; return; }
      frameIndex=played;
      this.img.src=cfg.frames[frameIndex];
      played++;
      }, cfg.interval);

    const startY=this.positionY, endY=window.innerHeight-this.containerHeight, distance=endY-startY;
    if(distance<=0){ clearInterval(this.frameTimer); 
      this.frameTimer=null; this.positionY=endY; 
      this.container.style.top=`${endY}px`; 
      return this.playTripAfterFall(); 
    }

    const startTime=performance.now();
    const step = (time) => {
      if (this.isDragging) {
          clearInterval(this.frameTimer);
          this.frameTimer = null;
          return this.animationFrameId = requestAnimationFrame(this.animate);
      }

      const elapsed = (time - startTime) / 1000;
      const deltaY = fallSpeed * elapsed;
      this.positionY = Math.min(startY + deltaY, endY); 
      this.container.style.top = `${this.positionY}px`;

      if (this.positionY < endY) {
          requestAnimationFrame(step);
      } else {
          clearInterval(this.frameTimer);
          this.frameTimer = null;
          this.positionY = endY;
          this.container.style.top = `${endY}px`;
          this.playTripAfterFall();
      }
    };
    requestAnimationFrame(step);
  }

  // play fallen/trip animation after landing
  playTripAfterFall() {
    const tripConfig = this.spriteConfig.fallen;
    if (!tripConfig) {
        this.resumeAfterFallen();
        return;
    }

    this.tripAfterFallActive = true;
    let frame = 0;
    const totalFrames = tripConfig.frames.length;
    this.img.src = tripConfig.frames[0];

    const frameTimer = setInterval(() => {
        frame++;

        if (frame >= totalFrames) {
            clearInterval(frameTimer);
            this.img.src = tripConfig.frames[totalFrames - 1];

            setTimeout(() => {
                if (this.tripAfterFallActive) this.resumeAfterFallen();
            }, this.spriteConfig.gettingupspeed);
        } else {
            this.img.src = tripConfig.frames[frame];
        }
    }, tripConfig.interval);
  }

  // continue normal actions after fall
  resumeAfterFallen() {
    if(this.isDragging) return;
    this.isFalling = false;
    this.isPetting = false;
    this.resetAnimation();
    this.lastTime = performance.now();
    this.currentAction = 'sit';
    this.setNextAction();
    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  // action selection and animation --------------------------------------------------
  // pick next action based on edge, jump chance, or forced actions
  // If on an edge choose edge behavior -> Random chance to jump -> Forced walk / forced think -> Pick next action from shuffled list
  setNextAction() {
    if (this.isDragging || this.isFalling ) return;

    this.resetAnimation();

    if (['top', 'left', 'right'].includes(this.currentEdge)) {
        this.edgeAction();
        return;
    }

    if (!this.isJumping && this.positionY >= window.innerHeight - this.containerHeight) {
      if (Math.random() < this.spriteConfig.JUMP_CHANCE) { // decicion on wether to jump or not
        const edges = ['top', 'left', 'right']
          .filter(e => this.spriteConfig.ALLOWANCES.includes(e));

        if (edges.length) {
          const target = edges[Math.floor(Math.random() * edges.length)]; // random coordinate on edge
          this.jumpToEdge(target);
          return;
        }
      }
    }

    // DeskBud: 底部空闲时偶尔低蹦一下增加乐趣(约 15% 概率)
    if (Math.random() < 0.15) {
      this.bounce(70);
      return;
    }

    if (this.forceWalkAfter) {
      this.forceWalkAfter = false;
      this.startForcedWalk();
      return;
    }

    if (this.forceThinkAfter) {
      this.forceThinkAfter = false;
      // DeskBud: forcethink 帧未 blob 化时先不播（原 URL 直赋 img 会与后台预载重复请求）
      if (this.isActionReady('forcethink')) { this.startForceThink(); return; }
      this.forceThinkAfter = true;   // 意图保留，等帧就绪的下一次机会
    }

    // DeskBud: 加权抽签模式——config 提供 actionWeights 时启用（宠物性格差异化 + 防连播抑制）；
    // 未提供则沿用洗牌序列（兼容旧 config）
    if (this.spriteConfig.actionWeights) {
      const next = this.pickWeighted();
      if (next) { this.currentAction = next; this.startAction(next); return; }
    }

    this.currentActionIndex++;
    if (this.currentActionIndex >= this.actionSequence.length) {
      this.currentActionIndex = 0;
      this.actionSequence = this.shuffle([...this.spriteConfig.ORIGINAL_ACTIONS]);
    }

    this.currentAction = this.actionSequence[this.currentActionIndex];
    this.startAction(this.currentAction);
  }

  // DeskBud: 按权重抽下一个动作。非走位动作在最近 2 次出现过则权重×0.25（抑制连播但不禁止），
  // walk 不抑制（走位连续合理）。未就绪的动作不参与抽取。
  pickWeighted() {
    const w = this.spriteConfig.actionWeights || {};
    const pool = Object.keys(w).filter(a => this.isActionReady(a) && (w[a] || 0) > 0);
    if (!pool.length) return null;
    const recent = this.recentActions || [];
    const weightOf = (a) => (a !== 'walk' && recent.includes(a)) ? (w[a] * 0.25) : w[a];
    let sum = 0;
    pool.forEach(a => { sum += weightOf(a); });
    if (sum <= 0) return null;
    let r = Math.random() * sum;
    for (const a of pool) { r -= weightOf(a); if (r < 0) return a; }
    return pool[pool.length - 1];
  }

  // 记录最近动作（pickWeighted 的防连播依据），只记成功的地面动作
  rememberAction(action) {
    if (this.spriteConfig.actionWeights) {
      this.recentActions = [action, ...(this.recentActions || [])].slice(0, 2);
    }
  }

  // force walk for a number of cycles
  startForcedWalk() {
    const { frames, interval } = this.spriteConfig.walk;
    const walkCycles = this.spriteConfig.forcewalk;
    this.currentAction = 'forced-walk';
    // DeskBud: forcewalk 配置是 {loops: N} 对象——取其 loops 数值传给 playAnimation
    //（旧代码直接传对象，playCount>=对象 恒 false = 无限走）
    const cycles = (walkCycles && Number.isFinite(walkCycles.loops)) ? walkCycles.loops : 6;
    this.playAnimation(frames, interval, cycles, () => this.setNextAction());
  }

  // force think for a number of cycles
  startForceThink() {
    const { frames, interval, loops } = this.spriteConfig.forcethink;
    this.currentAction = 'force-think';
    this.playAnimation(frames, interval, loops, () => this.setNextAction());
  }

  // pet animation loop
  startPetAnimation() {
    this.resetAnimation();

    const petConfig = this.spriteConfig.pet;
    if (!petConfig) return;

    this.currentAction = 'pet';
    let frame = 0;
    this.img.src = petConfig.frames[0];

    this.frameTimer = setInterval(() => {
      frame = (frame + 1) % petConfig.frames.length;
      this.img.src = petConfig.frames[frame];
    }, petConfig.interval);
  }

  // stop pet animation
  stopPetAnimation() {
    this.resetAnimation();
    this.currentAction = this.wasActionBeforePet || 'sit';
    this.wasActionBeforePet = null;
    this.setNextAction();
  }

  // start a given action (handles direction, frames, loops, and special cases)
  // DeskBud: 向外派发动作变化（site.js 据此按概率冒状态气泡，见 bubble.json v6 的 states）
  emitAction(action, extra) {
    try {
      document.dispatchEvent(new CustomEvent('webmeji:action', {
        detail: Object.assign({ action: action, edge: this.currentEdge, id: this.img.id }, extra || {})
      }));
    } catch (e) {}
  }

  // DeskBud: 交互气泡触发源（click 单击 / drag 拖拽松手），100% 触发、最高优先级
  emitReact(kind) {
    try {
      document.dispatchEvent(new CustomEvent('webmeji:react', { detail: { kind: kind, id: this.img.id } }));
    } catch (e) {}
  }

  // DeskBud: 渐进式预载下，动作帧是否已转成 blob（未就绪则不能播，否则破图/空帧）
  isActionReady(action) {
    const set = this.spriteConfig.__ready;
    if (!set) return true;                       // 未启用渐进式 → 全部可用
    // 复合动作无独立 frames 配置（复用其它动作的帧）→ 就绪性跟随源动作。
    // ⚠️ 否则 topwalk 永远"未就绪"，startAction 会在顶部被兜底随机换成 trip/spin，倒立走消失。
    return set.has(ACTION_FRAME_ALIAS[action] || action);
  }

  // DeskBud: 静帧站立等待——walk/stand 帧未就绪时只显示站立静帧、不启动行为调度，
  // 轮询等帧就绪后自动开跑（弱网 8s 兜底出生场景，修复"滑行/定格后永远不动"）
  bootIfReady() {
    if (this.isActionReady('walk') || this.isActionReady('stand')) {
      // DeskBud: 只从已就绪动作里挑（ORIGINAL_ACTIONS 里可能混入未就绪动作，
      // 旧写法"挑到未就绪→无备选→递归回 bootIfReady"会无限递归 RangeError，熊猫曾因此构造失败）
      const ready = (this.spriteConfig.ORIGINAL_ACTIONS || []).filter(a => this.isActionReady(a));
      if (ready.length) {
        this.currentAction = ready[Math.floor(Math.random() * ready.length)];
        this.startAction(this.currentAction);
        return;
      }
      // walk/stand 就绪但地面池无一就绪（罕见竞态）→ 不硬启，落到下方 bootPoll 继续等
    }
    const walk = this.spriteConfig.walk;
    if (walk && Array.isArray(walk.frames) && walk.frames.length) this.img.src = walk.frames[0];
    if (!this.bootPoll) {
      this.bootPoll = setInterval(() => {
        if (this.isActionReady('walk') || this.isActionReady('stand')) {
          clearInterval(this.bootPoll);
          this.bootPoll = null;
          this.currentAction = this.actionSequence[this.currentActionIndex];
          this.startAction(this.currentAction);
        }
      }, 200);
    }
  }

  startAction(action) {  
    if (this.isDragging || this.isFalling ) return;
    // DeskBud: 帧未就绪 → 换一个已就绪的常规动作（最多再递归一次，不会死循环）
    if (!this.isActionReady(action)) {
      const avail = (this.spriteConfig.ORIGINAL_ACTIONS || []).filter(a => this.isActionReady(a));
      if (avail.length) this.startAction(avail[Math.floor(Math.random() * avail.length)]);
      else this.bootIfReady();      // 一个就绪的都没有 → 静帧站立等待，绝不滑行
      return;
    }
    this.currentAction = action;
    this.resetAnimation();
    this.rememberAction(action);       // DeskBud: 记录最近动作，供加权抽签防连播
    this.emitAction(action);

    if (action === 'climbTop') {
      this.direction = Math.random() < 0.5 ? -1 : 1;
      this.updateImageDirection();
    }
    if (this.isJumping) {
      this.animationFrameId = requestAnimationFrame(this.animate);
      return;
    }

    // DeskBud: 顶部倒立行走(头朝下、脚朝上, 沿顶边水平来回)——walk 帧 + scaleY(-1)
    // 一段 3~6.5s 到点后由 topDecide 决策: 多数续走(帧续播不重启), 偶尔挂/回落
    if (action === 'topwalk') {
      this.inverted = true;
      this.updateImageDirection();   // 进入即头朝下, 防上一动作的 transform 残留
      this.positionY = 0;
      this.direction = Math.random() < 0.5 ? -1 : 1;
      const walk = this.spriteConfig.walk;
      this.img.src = walk.frames[0];
      let f = 0;
      this.frameTimer = setInterval(() => {
        f = (f + 1) % walk.frames.length;
        this.img.src = walk.frames[f];
      }, walk.interval);
      this.actionCompletionTimer = setTimeout(() => this.topDecide(true), 3000 + Math.random() * 3500);
      return;
    }

    // DeskBud: 侧边攀爬——固定向上爬升到顶(位移在 animate 的 climbSide 分支, 到顶自动转顶部)
    if (action === 'climbSide') {
      this.inverted = false;
      this.direction = -1;   // 恒向上(移除原随机方向的"往下爬/方向反")
      if (this.currentEdge === 'left') this.facing = 'right';     // 贴左壁脸朝屏外(镜像)
      else if (this.currentEdge === 'right') this.facing = 'left'; // 贴右壁脸朝屏外(不镜像)
      this.updateImageDirection();
      const cfg = this.spriteConfig.climbSide;
      this.img.src = cfg.frames[0];
      let f = 0;
      this.frameTimer = setInterval(() => {
        f = (f + 1) % cfg.frames.length;
        this.img.src = cfg.frames[f];
      }, cfg.interval);
      return;
    }

    // DeskBud: 侧边被抓稳——短暂挂住后转 climbSide 向上爬(不再中途掉落)
    if (action === 'hangstillSide') {
      this.inverted = false;
      this.updateImageDirection();   // 清除可能残留的 scaleY(-1)
      const cfg = this.spriteConfig.hangstillSide;
      this.img.src = cfg.frames[0];
      let f = 0;
      if (cfg.frames.length > 1) {
        this.frameTimer = setInterval(() => {
          f = (f + 1) % cfg.frames.length;
          this.img.src = cfg.frames[f];
        }, cfg.interval);
      }
      const dur = 450 + Math.random() * 700;   // 抓稳 ~0.45-1.15s
      this.actionCompletionTimer = setTimeout(() => {
        if (this.frameTimer) { clearInterval(this.frameTimer); this.frameTimer = null; }
        if (this.isSideEdge(this.currentEdge)) this.startAction('climbSide');
        else this.setNextAction();
      }, dur);
      return;
    }

    // DeskBud: 挂顶摆动(头朝上正挂，不倒置)；结束后交 topDecide 转顶边日常
    if (action === 'hangstillTop') {
      this.inverted = false;
      this.updateImageDirection();   // 立即清除倒走残留的 scaleY(-1)，避免悬挂显示成头朝下
      const cfg = this.spriteConfig.hangstillTop;
      this.img.src = cfg.frames[0];
      let f = 0;
      if (cfg.frames.length > 1) {
        this.frameTimer = setInterval(() => {
          f = (f + 1) % cfg.frames.length;
          this.img.src = cfg.frames[f];
        }, cfg.interval);
      }
      const dur = cfg.randomizeDuration
        ? Math.random() * (cfg.max - cfg.min) + cfg.min
        : cfg.interval * cfg.loops;
      this.actionCompletionTimer = setTimeout(() => {
        if (this.frameTimer) { clearInterval(this.frameTimer); this.frameTimer = null; }
        if (this.currentEdge === 'top') this.topDecide(true);
        else this.setNextAction();
      }, dur);
      return;
    }

    const config = this.spriteConfig[action];
    if (!config) {
      // DeskBud: 动作名对不上 config（如 sequence 混入别名/配置残缺）→ 不静默卡死，前进下一动作；
      // 守卫防递归死循环（连续 5 个坏动作就回静帧等待）
      this.__badActionGuard = (this.__badActionGuard || 0) + 1;
      if (this.__badActionGuard > 5) { this.__badActionGuard = 0; this.bootIfReady(); return; }
      this.setNextAction();
      return;
    }
    this.__badActionGuard = 0;

    const { frames, interval, loops = 1 } = config;

    // DeskBud: 常规/地面动作复位倒立标记
    this.inverted = false;
    this.updateImageDirection();

    if (action === 'sit') {
      const duration = config.randomizeDuration
        ? Math.random() * (config.max - config.min) + config.min
        : interval * loops;
      // DeskBud 增强: 停留期间循环播放全部帧(呼吸/摆动动画), 时长到点再切下一动作
      let f = 0;
      this.img.src = frames[0];
      if (frames.length > 1) {
        this.frameTimer = setInterval(() => {
          f = (f + 1) % frames.length;
          this.img.src = frames[f];
        }, interval);
      }
      this.actionCompletionTimer = setTimeout(() => {
        if (this.frameTimer) { clearInterval(this.frameTimer); this.frameTimer = null; }
        this.forceWalkAfter = true;
        this.setNextAction();
      }, duration);
      return;
    }

    this.playAnimation(frames, interval, loops, () => {
      if (action === 'spin') {
        this.direction *= -1;
        this.facing = this.facing === 'left' ? 'right' : 'left';
        this.updateImageDirection();
      }

      // force-actions can be set here
      if (['trip', 'spin'].includes(action)) this.forceWalkAfter = true;
      if (action === 'dance') this.forceThinkAfter = true;

      this.setNextAction();
    });
  }

  // helper to play a sequence of frames for a given number of loops
  playAnimation(frames, interval, loops, onComplete){
    // DeskBud: 数据防御——空帧/缺 loops 不再形成"永久卡死黑洞"（熊猫 forcethink 缺 loops 的教训）
    if (!Array.isArray(frames) || !frames.length) {
      if (onComplete) setTimeout(onComplete, 0);
      return;
    }
    loops = (Number.isFinite(loops) && loops > 0) ? loops : 1;
    let playCount=0, f=0;
    this.currentFrame=0;
    this.img.src=frames[0];
    if(this.frameTimer) clearInterval(this.frameTimer);

    this.frameTimer=setInterval(()=>{
        this.currentFrame=f=(f+1)%frames.length;
        this.img.src=frames[f];
        if(f===frames.length-1 && ++playCount>=loops){
            clearInterval(this.frameTimer);
            this.frameTimer=null;
            this.currentAction=null;
            this.actionCompletionTimer=setTimeout(onComplete,0);
        }
    }, interval);
  }

  // main animation loop --------------------------------------------------
  animate(time) {
    if (!this.lastTime) this.lastTime = time;
    let delta = (time - this.lastTime) / 1000;
    this.lastTime = time;
    // 后台标签 rAF 停摆，切回首帧 delta 可能是几十秒 → 钳到 50ms，防瞬移/朝向跳变
    if (delta > 0.05) delta = 0.05;
    if (this.isDragging || this.isFalling) {
        this.animationFrameId = requestAnimationFrame(this.animate);
        return;
    }
    const movingActions = ['walk', 'forced-walk', 'climbTop', 'topwalk']; // add actions with horizontal movement here
    if (movingActions.includes(this.currentAction)) {
        // DeskBud: 位移保险——统一 gate 在 walk 就绪上（climbTop/topwalk/forced-walk 的帧
        // 各自就绪时间不同，walk 未就绪时禁止一切走动位移，堵死"滑行/直线运动"）
        if (!this.isActionReady('walk')) {
            this.animationFrameId = requestAnimationFrame(this.animate);
            return;
        }
        const dx = this.direction * this.spriteConfig.walkspeed * delta;
        this.positionX += dx;
        this.setFacingFromDelta(dx);

        // flips sprites and movement direction upon reaching a wall
        if (this.positionX <= 0) {
            this.positionX = 0;
            this.direction = 1;
            this.facing = 'left';    // 向右走，素材面朝右(不镜像)
            this.updateImageDirection();
        } else if (this.positionX >= this.maxPos) {
            this.positionX = this.maxPos;
            this.direction = -1;
            this.facing = 'right';   // 向左走，镜像成面朝左
            this.updateImageDirection();
        }
        this.applyEdgeOffset();
    }

    if (this.currentAction === 'climbSide') {
      // DeskBud: 侧边攀爬 = 恒向上爬升(方向反已修: direction 固定 -1), 到顶转顶部倒挂活动
      const climbSpeed = this.spriteConfig.fallspeed * 0.8;   // ~144px/s 向上
      this.positionY -= climbSpeed * delta;
      if (this.positionY <= 0) {
        this.positionY = 0;
        this.container.style.top = '0px';
        // 爬到顶部 → 清爬行帧, 转顶部行为
        if (this.frameTimer) { clearInterval(this.frameTimer); this.frameTimer = null; }
        this.currentAction = null;
        this.currentEdge = 'top';
        this.updateEdgeClass();
        this.startEdgeIdle();
      } else {
        this.container.style.top = `${this.positionY}px`;
      }
    }
    this.animationFrameId = requestAnimationFrame(this.animate);
  }
}
