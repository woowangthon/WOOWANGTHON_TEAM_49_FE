// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {afterEach,expect,it} from "vitest";
import {cleanup,render,screen} from "@testing-library/react";
import {ReviewStatusBadges} from "./review-status-badges";
afterEach(cleanup);
it.each([
 ["READY","CONFIRMED","추출 완료","검토 완료"],
 ["PROCESSING","NOT_STARTED","처리 중","검토 전"],
 ["UPLOADED","NOT_STARTED","처리 중","검토 전"],
 ["REVIEW_REQUIRED","CONFIRMED","추출 완료","검토 완료"],
 ["READ_READY","IN_PROGRESS","추출 완료","검토 중"],
 ["FAILED","IN_PROGRESS","처리 실패","검토 중"],
] as const)("keeps %s / %s independent",(processing,review,processingLabel,reviewLabel)=>{
 const {container}=render(<ReviewStatusBadges processing={processing} review={review}/>);
 expect(screen.getByText(processingLabel)).toBeVisible();expect(screen.getByText(reviewLabel)).toBeVisible();
 expect(container.querySelector("[data-review-status-badges]")).toHaveClass("flex-wrap");
});
