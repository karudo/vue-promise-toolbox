import Vue from 'vune'

const defaultData = {
  result: undefined,
  error: undefined,
  pending: undefined,
  fulfilled: undefined,
  rejected: undefined,

  skipped: undefined,
  promise: undefined
}

const proxyProps = Object.keys(defaultData)

class MappedPromise {
  constructor (vm, params) {
    this.vm = vm
    this.params = params
    this.data = new Vue({
      data: () => defaultData
    })
    if (this.params.skip) {
      this.initSkip()
    } else {
      this.watch()
    }
  }

  initSkip () {
    this.vm.$watch(
      () => this.params.skip.call(this.vm, this.vm),
      (skipped, prevSkipped) => {
        if (skipped !== prevSkipped) {
          Object.extend(this.data, {
            ...defaultData,
            skipped: skipped
          })
          if (skipped) {
            this.unwatch()
          } else {
            this.watch()
          }
        }
      },
      {immediate: true}
    )
  }

  watch () {
    this.unwatch()
    this._unwatch = this.vm.$watch(
      () => this.params.promiseFn.call(this.vm, this.vm),
      (promise) => {
        this.onNewPromise(promise)
        promise.then(
          result => this.onSettle(promise, {result, fulfilled: true}),
          error => this.onSettle(promise, {error, rejected: true})
        )
      },
      {immediate: true}
    )
  }

  unwatch () {
    if (this._unwatch) {
      this._unwatch()
      this._unwatch = undefined
    }
  }

  onNewPromise (promise) {
    Object.assign(this.data, {
      promise,
      pending: true,
      result: undefined,
      error: undefined,
      fulfilled: false,
      rejected: false
    })
  }

  onSettle (promise, extend) {
    if (this.data.promise === promise && !this.data.skipped) {
      Object.assign(this.data, {pending: false}, extend)
    }
  }

  getProxy () {
    const fields = {}
    for (const propName of proxyProps) {
      fields[propName] = {
        configurable: false,
        enumerable: true,
        get: () => this.data[propName],
        set: () => {
          throw new Error('')
        }
      }
    }
    return Object.create(null, fields)
  }
}

export default function mapPromise (params) {
  if (params instanceof Function) {
    params = {
      promiseFn: params
    }
  }

  return function () {
    const comp = new MappedPromise(this, params)
    return comp.getProxy()
  }
}
