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