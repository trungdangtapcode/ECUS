import { createBrowserRouter } from "react-router-dom";
import { Layout } from "./layout";
import { CasesPage } from "../features/cases/cases-page";
import { CaseDetailPage } from "../features/cases/case-detail-page";
import { NotFoundPage } from "./not-found-page";
import { ReviewPage } from "../features/review/review-page";
import { DesignProvider } from "../design/provider";
import { Landing } from "../design/harbor/landing";
import { Outlet } from "react-router-dom";

export const router = createBrowserRouter([
  {
    element: (
      <DesignProvider>
        <Outlet />
      </DesignProvider>
    ),
    children: [
      { path: "/", element: <Landing /> },
      { path: "/landing", element: <Landing /> },
      {
        element: <Layout />,
        children: [
          { path: "/cases", element: <CasesPage /> },
          { path: "/cases/:caseId", element: <CaseDetailPage /> },
          { path: "/cases/:caseId/review", element: <ReviewPage /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
