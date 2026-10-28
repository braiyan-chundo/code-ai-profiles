import { useState } from "react";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";
import { Block, Sample } from "../ShowcaseSection";

export default function InputOtpSection() {
  const [value, setValue] = useState("12");
  const [invalid, setInvalid] = useState("12");
  return (
    <>
      <Block title="Variantes">
        <Sample label="seis dígitos, un grupo">
          <InputOTP maxLength={6} aria-label="Código de ejemplo">
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <InputOTPSlot key={index} index={index} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </Sample>
        <Sample label="dos grupos con separador">
          <InputOTP maxLength={6} aria-label="Código de ejemplo en dos grupos">
            <InputOTPGroup>
              {[0, 1, 2].map((index) => (
                <InputOTPSlot key={index} index={index} />
              ))}
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              {[3, 4, 5].map((index) => (
                <InputOTPSlot key={index} index={index} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </Sample>
      </Block>
      <Block title="Estados">
        <Sample label="controlado (parcial)">
          <InputOTP maxLength={4} value={value} onChange={setValue} aria-label="Código de cuatro dígitos">
            <InputOTPGroup>
              {[0, 1, 2, 3].map((index) => (
                <InputOTPSlot key={index} index={index} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </Sample>
        <Sample label="deshabilitado">
          <InputOTP maxLength={4} disabled aria-label="Código deshabilitado">
            <InputOTPGroup>
              {[0, 1, 2, 3].map((index) => (
                <InputOTPSlot key={index} index={index} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </Sample>
        <Sample label="aria-invalid">
          <InputOTP maxLength={4} value={invalid} onChange={setInvalid} aria-label="Código con error">
            <InputOTPGroup>
              {[0, 1, 2, 3].map((index) => (
                <InputOTPSlot key={index} index={index} aria-invalid />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </Sample>
      </Block>
    </>
  );
}
