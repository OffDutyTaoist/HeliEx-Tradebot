export type Order = {
  price: number
  amount: number
}

export type OrderBook = {
  bids: Order[]
  asks: Order[]
}

export type Trade = {
  id: number
  price: string
  amount: string
  created_at: string
}

export type WalletAssetStatus = {
  online: boolean
  error: string
}

export type WalletStatus = {
  online: boolean
  assets: {
    GRC?: WalletAssetStatus
    CURE?: WalletAssetStatus
  }
}