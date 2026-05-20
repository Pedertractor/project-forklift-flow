import axios from "axios";
import { env } from "../../env/index.js";
import type {
  EmployeeInfoByCardResponse,
  EmployeeVerifyUnit,
} from "../../types/external-api/index.js";

const urlBaseForVerifyEmployees = env.URL_VERIFY_EMPLOYEES;

export async function infoByCardAndUnit(
  unit: EmployeeVerifyUnit,
  card: string,
): Promise<EmployeeInfoByCardResponse | null> {
  if (!urlBaseForVerifyEmployees) {
    return null;
  }

  console.log("is here");

  try {
    const response = await axios.get<EmployeeInfoByCardResponse>(
      `${urlBaseForVerifyEmployees}/employee/get/${card}/${unit}`,
      {
        timeout: 5000,
        headers: {
          nameapplication: env.APPNAME,
          key: env.APPKEY,
        },
      },
    );

    console.log("response", response.data);

    return response.data;
  } catch {
    return null;
  }
}
