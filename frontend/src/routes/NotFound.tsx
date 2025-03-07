import { Trans, useTranslation } from "react-i18next";
import { FiFrown } from "react-icons/fi";

import { Root } from "../layout/Root";
import { Link } from "../router";
import { match } from "../util";
import { CenteredContent } from "../ui";
import { makeFallbackRoute } from "../rauta";


export const NotFoundRoute = makeFallbackRoute({
    prepare: () => {},
    render: () => <NotFound kind="page" />,
});

type Props = {
    kind: "page" | "video";
};

export const NotFound: React.FC<Props> = ({ kind }) => {
    const { t } = useTranslation();

    return (
        <Root nav={[]}>
            <FiFrown css={{ margin: "0 auto", display: "block", fontSize: 90 }} />
            <h1 css={{ textAlign: "center", margin: "32px 0 48px 0 !important" }}>
                {match(kind, {
                    "page": () => t("not-found.page-not-found"),
                    "video": () => t("not-found.video-not-found"),
                })}
            </h1>
            <CenteredContent>
                <p css={{ margin: "16px 0" }}>
                    {match(kind, {
                        "page": () => t("not-found.page-explanation"),
                        "video": () => t("not-found.video-explanation"),
                    })}
                    {t("not-found.url-typo")}
                </p>
                <Trans i18nKey="not-found.actions">
                    foo<Link to="/">bar</Link>
                </Trans>
            </CenteredContent>
        </Root>
    );
};
