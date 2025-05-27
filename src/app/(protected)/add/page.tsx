import CoinForm from "@/components/CoinForm"
import PaperMoneyForm from "@/components/PaperMoneyForm"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function Add() {
  return (
    <div>
      <Tabs
        defaultValue="coin"
        className=" flex flex-col items-center justify-center"
      >
        <TabsList className="w-[50%]">
          <TabsTrigger className="w-full" value="coin">
            Coin
          </TabsTrigger>
          <TabsTrigger className="w-full" value="bill">
            Bill
          </TabsTrigger>
        </TabsList>
        <TabsContent value="coin" className="w-full">
          <CoinForm />
        </TabsContent>
        <TabsContent value="bill" className="w-full">
          <PaperMoneyForm />
        </TabsContent>
      </Tabs>
    </div>
  )
}
