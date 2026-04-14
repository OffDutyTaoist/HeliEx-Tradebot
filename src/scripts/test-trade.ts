import 'dotenv/config'
import { getMyOrders, placeOrder, cancelOrder } from '../private-api.js'

async function main(): Promise<void> {
  console.log('Testing trade flow...\n')

  const order = await placeOrder({
    side: 'buy',
    price: '0.30000000',
    amount: '0.10000000',
  })

  console.log('--- Order Placed ---')
  console.log(order)

  const ordersAfterPlace = await getMyOrders()
  console.log('\n--- Open Orders After Place ---')
  console.log(ordersAfterPlace)

  const placedOrderId = order.id

  if (!placedOrderId) {
    throw new Error('Placed order did not return an id')
  }

  const cancelResult = await cancelOrder(placedOrderId)
  console.log('\n--- Cancel Result ---')
  console.log(cancelResult)

  const ordersAfterCancel = await getMyOrders()
  console.log('\n--- Open Orders After Cancel ---')
  console.log(ordersAfterCancel)
}

main().catch((err) => {
  console.error('Trade flow test failed:')
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})