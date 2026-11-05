import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { chartColors, LineSeriesChart } from "@/components/charts";
import { SelectionDropdown } from "@/components/selection-dropdown";
import { StatePanel, WeatherLoader } from "@/components/states";

describe("interface states", () => {
  it("shows a loading status", () => {
    render(<StatePanel status="loading" />);
    const loader = screen.getByRole("status", { name: "Loading your page…" });
    expect(loader).toBeVisible();
    expect(loader).toHaveClass("fixed", "inset-0");
    expect(loader).toHaveTextContent("Loading your page…");
  });

  it("shows the animated weather loader for the selected city", () => {
    render(<WeatherLoader location="Mumbai" />);
    const loader = screen.getByRole("status", { name: "Loading weather for Mumbai" });
    expect(loader).toBeVisible();
    expect(loader).toHaveClass("fixed", "inset-0", "z-[60]");
    expect(screen.getByText("Loading Mumbai weather…")).toBeVisible();
  });

  it("shows an error and retries", async () => {
    const onRetry = vi.fn();
    render(<StatePanel status="error" message="Backend unavailable" onRetry={onRetry} />);
    expect(screen.getByText("Backend unavailable")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("shows an empty message", () => {
    render(<StatePanel status="empty" message="No observations in this date range." />);
    expect(screen.getByText("No observations in this date range.")).toBeVisible();
  });
});

describe("charts", () => {
  it("renders a labeled chart", () => {
    render(
      <LineSeriesChart
        label="Hourly forecast temperature"
        data={[{ label: "01:00", temperature: 18 }]}
        lines={[{ key: "temperature", name: "Temperature", color: chartColors.primary }]}
      />,
    );
    expect(screen.getByRole("img", { name: "Hourly forecast temperature" })).toBeVisible();
  });

  describe("selection dropdown", () => {
    it("aligns right-edge menus to the trigger", async () => {
      render(
        <SelectionDropdown
          label="Units"
          value="metric"
          options={[
            { value: "metric", label: "Metric" },
            { value: "imperial", label: "Imperial" },
          ]}
          onChange={vi.fn()}
          align="end"
        />,
      );

      await userEvent.click(screen.getByRole("button", { name: "Units" }));

      expect(screen.getByRole("listbox", { name: "Units" })).toHaveClass("right-0", "left-auto");
    });
  });

});
