import { useLocalSearchParams } from "expo-router";
import MonthlyPaymentAmount from "../../(admin)/members/[memberId]/monthly-payment";

export default function MemberMonthlyPaymentAmount() {
  const { month } = useLocalSearchParams<{ month: string }>();
  return <MonthlyPaymentAmount memberMonth={month} />;
}
