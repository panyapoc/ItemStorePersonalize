/**
 * Workaround for native Promise-s not being cancellable
 * @param {Promise} promise Native promise
 * @param {number} seconds Max seconds to run
 */
function timeOutNativePromise(promise, seconds) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(
      () => {
        settled = true;
        reject(new Error(`Operation timed out after ${seconds} seconds`));
      },
      seconds * 1000,
    );
    
    promise
      .then((result) => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          resolve(result);
        }
      })
      .catch((err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          reject(err);
        }
      });
  });
}

module.exports = {
  timeOutNativePromise,
};
