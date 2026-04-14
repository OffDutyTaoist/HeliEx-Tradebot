import 'dotenv/config'
import { getBalances, getMyOrders } from '../private-api.js'

async function main(): Promise<void> {
  console.log('Testing private API...\n')

  const balances = await getBalances()
  console.log('--- Balances ---')
  console.log(balances)

  const orders = await getMyOrders()
  console.log('\n--- My Orders ---')
  console.log(orders)
}

main().catch((err) => {
  console.error('Private API test failed:')
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})