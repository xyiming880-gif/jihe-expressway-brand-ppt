(function () {
  const slides = [...document.querySelectorAll('#deck > .slide')];
  const loading = new WeakMap();

  function removeRetry(image) {
    image.closest('.frame-img')?.querySelector('.asset-retry')?.remove();
  }

  function showRetry(image, index) {
    const frame = image.closest('.frame-img');
    if (!frame || frame.querySelector('.asset-retry')) return;
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'asset-retry';
    retry.dataset.assetRetry = '';
    retry.textContent = '重试加载图片';
    retry.addEventListener('click', () => {
      retry.remove();
      image.classList.remove('is-error');
      image.removeAttribute('src');
      loadImage(image, index, true);
    });
    frame.appendChild(retry);
  }

  function loadImage(image, index, force = false) {
    const source = image.dataset.src;
    if (!source || image.classList.contains('is-loaded')) return Promise.resolve(image);
    if (loading.has(image)) return loading.get(image);

    removeRetry(image);
    image.classList.remove('is-error');
    image.dataset.assetState = 'loading';
    const promise = new Promise((resolve, reject) => {
      const cleanup = () => {
        image.removeEventListener('load', complete);
        image.removeEventListener('error', fail);
      };
      const complete = () => {
        cleanup();
        removeRetry(image);
        image.classList.remove('is-error');
        image.classList.add('is-loaded');
        image.dataset.assetState = 'loaded';
        loading.delete(image);
        resolve(image);
      };
      const fail = () => {
        cleanup();
        image.classList.add('is-error');
        image.dataset.assetState = 'error';
        loading.delete(image);
        showRetry(image, index);
        reject(new Error(`slide ${index + 1} image failed: ${source}`));
      };
      image.addEventListener('load', complete);
      image.addEventListener('error', fail);
      image.src = source;
      if (image.complete && image.naturalWidth > 0) queueMicrotask(complete);
    });
    loading.set(image, promise);
    promise.catch(() => {});
    return promise;
  }

  function loadSlideAssets(index) {
    const slide = slides[index];
    if (!slide) return Promise.resolve([]);
    return Promise.allSettled([...slide.querySelectorAll('img[data-src]')].map((image) => loadImage(image, index)));
  }

  function prefetchAround(index) {
    loadSlideAssets(index);
    const adjacent = [...new Set([index + 1, index - 1])].filter((candidate) => candidate >= 0 && candidate < slides.length);
    const run = () => adjacent.forEach((target) => loadSlideAssets(target));
    if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 700 });
    else setTimeout(run, 0);
  }

  function retrySlideAssets(index) {
    const slide = slides[index];
    if (!slide) return Promise.resolve([]);
    return Promise.allSettled(
      [...slide.querySelectorAll('img[data-src].is-error')].map((image) => {
        removeRetry(image);
        image.classList.remove('is-error');
        image.removeAttribute('src');
        return loadImage(image, index, true);
      }),
    );
  }

  window.__slideAssets = { loadSlideAssets, prefetchAround, retrySlideAssets };
})();
