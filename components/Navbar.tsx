import { Box } from "lucide-react";
import React from "react";
import { Button } from "./ui/Button";
import { useNavigate, useOutletContext } from "react-router";

const Navbar = () => {
  const navigate = useNavigate()
  const { isSignedIn, userName, signIn, signOut } =
    useOutletContext<AuthContext>();
  const handleAuthClick = async () => {
    if (isSignedIn) {
      try {
        await signOut();
      } catch (error) {
        console.error(`Puter sign out failed: ${error}`);
      }
      return;
    }
    try {
      await signIn();
    } catch (error) {
      console.error(`Puter sign in failed: ${error}`);
    }
  };
  return (
    <header className="navbar">
      <nav className="inner">
        <div className="left">
          <div className="brand" onClick={() => navigate('/')}>
            <Box className="logo" />
            <span className="name">Roomify</span>
          </div>
          <ul className="links">
            <a href="#">Product</a>
            <a href="#">Pricing</a>
            <a href="#">Community</a>
            <a href="#">Enterprise</a>
          </ul>
        </div>
        <div className="actions">
          {isSignedIn ? (
            <>
              <span className="greeting">
                {userName ? `Hi, ${userName}` : "Signed in"}
              </span>
              <Button size="sm" onClick={handleAuthClick} className="btn">
                Log Out
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleAuthClick} size="sm" variant="ghost">
                Log In
              </Button>
              <a href="#upload" className="cta">
                Get started
              </a>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
