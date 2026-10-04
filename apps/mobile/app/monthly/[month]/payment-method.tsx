import { useLocalSearchParams } from "expo-router";
import MonthlyPaymentMethod from "../../(admin)/members/[memberId]/monthly-payment-method";

export default function MemberMonthlyPaymentMethod() {
  const { month } = useLocalSearchParams<{ month: string }>();
  return <MonthlyPaymentMethod memberMonth={month} />;
}
