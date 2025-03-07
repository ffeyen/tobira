import React from "react";
import { useTranslation } from "react-i18next";

import { BREAKPOINT as NAV_BREAKPOINT } from "../Navigation";

type SearchFieldProps = {
    variant: "desktop" | "mobile";
};

export const SearchField: React.FC<SearchFieldProps> = ({ variant }) => {
    const { t } = useTranslation();

    const extraCss = variant === "desktop"
        ? {
            maxWidth: 280,
            [`@media (max-width: ${NAV_BREAKPOINT}px)`]: {
                display: "none",
            },
        }
        : {
            width: "100%",
        };

    return (
        <input
            type="text"
            placeholder={t("search")}
            css={{
                flex: "1 1 0px",
                margin: "0 8px",
                minWidth: 50,
                height: 35,
                borderRadius: 4,
                border: "1.5px solid var(--grey80)",
                padding: "0 12px",
                "&:focus": {
                    outline: "none",
                    boxShadow: "0 0 0 1px var(--accent-color)",
                    borderColor: "var(--accent-color)",
                },
                ...extraCss,
            }}
        />
    );
};
