import { describe, expect, it } from "@jest/globals";
import { queryByTestId } from "@testing-library/dom";
import "@testing-library/jest-dom";
import { renderWakatimeCard } from "../src/cards/wakatime.js";
import { wakaTimeData } from "./fetchWakatime.test.js";

describe("Test Render WakaTime Card", () => {
  it("should render correctly", () => {
    const card = renderWakatimeCard(wakaTimeData.data);
    expect(card).toMatchSnapshot();
  });

  it("should render correctly with compact layout", () => {
    const card = renderWakatimeCard(wakaTimeData.data, { layout: "compact" });

    expect(card).toMatchSnapshot();
  });

  it("should render correctly with compact layout when langs_count is set", () => {
    const card = renderWakatimeCard(wakaTimeData.data, {
      layout: "compact",
      langs_count: 2,
    });

    expect(card).toMatchSnapshot();
  });

  it("should hide languages when hide is passed", () => {
    document.body.innerHTML = renderWakatimeCard(wakaTimeData.data, {
      hide: ["YAML", "Other"],
    });

    expect(queryByTestId(document.body, /YAML/i)).toBeNull();
    expect(queryByTestId(document.body, /Other/i)).toBeNull();
    expect(queryByTestId(document.body, /TypeScript/i)).not.toBeNull();
  });

  it("should render translations", () => {
    document.body.innerHTML = renderWakatimeCard({}, { locale: "cn" });
    expect(document.getElementsByClassName("header")[0].textContent).toBe(
      "WakaTime 周统计",
    );
    expect(
      document.querySelector('g[transform="translate(0, 0)"]>text.stat.bold')
        .textContent,
    ).toBe("WakaTime 用户个人资料未公开");
  });

  it("should render without rounding", () => {
    document.body.innerHTML = renderWakatimeCard(wakaTimeData.data, {
      border_radius: "0",
    });
    expect(document.querySelector("rect")).toHaveAttribute("rx", "0");
    document.body.innerHTML = renderWakatimeCard(wakaTimeData.data, {});
    expect(document.querySelector("rect")).toHaveAttribute("rx", "4.5");
  });

  it('should show "no coding activity this week" message when there has not been activity', () => {
    document.body.innerHTML = renderWakatimeCard(
      {
        ...wakaTimeData.data,
        languages: undefined,
      },
      {},
    );
    expect(document.querySelector(".stat").textContent).toBe(
      "No coding activity this week",
    );
  });

  it('should show "no coding activity this week" message when using compact layout and there has not been activity', () => {
    document.body.innerHTML = renderWakatimeCard(
      {
        ...wakaTimeData.data,
        languages: undefined,
      },
      {
        layout: "compact",
      },
    );
    expect(document.querySelector(".stat").textContent).toBe(
      "No coding activity this week",
    );
  });

  it("should render correctly with percent display format", () => {
    const card = renderWakatimeCard(wakaTimeData.data, {
      display_format: "percent",
    });
    expect(card).toMatchSnapshot();
  });

  it("should not mutate the provided WakaTime data", () => {
    const stats = JSON.parse(JSON.stringify(wakaTimeData));
    const before = JSON.stringify(stats);

    renderWakatimeCard(stats, { langs_count: 2 });

    expect(JSON.stringify(stats)).toBe(before);
  });

  it("should not drop every language when langs_count is invalid", () => {
    document.body.innerHTML = renderWakatimeCard(wakaTimeData.data, {
      // @ts-ignore
      langs_count: "abc",
    });

    expect(document.querySelector(".stat").textContent).not.toBe(
      "No coding activity this week",
    );
    expect(queryByTestId(document.body, "TypeScript")).not.toBeNull();
  });

  it("should not produce NaN percentages when all languages are at 0%", () => {
    const card = renderWakatimeCard(
      {
        ...wakaTimeData.data,
        languages: [
          {
            name: "TypeScript",
            percent: 0,
            text: "0 secs",
            hours: 0,
            minutes: 1,
          },
          { name: "YAML", percent: 0, text: "0 secs", hours: 0, minutes: 1 },
        ],
      },
      {},
    );

    expect(card).not.toContain("NaN");
  });
});
