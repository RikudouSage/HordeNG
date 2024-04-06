{ pkgs ? import <nixpkgs> {} }:
pkgs.mkShell {
    nativeBuildInputs = with pkgs.buildPackages; [
      awscli
      git
      nodejs_18
      nodePackages.serverless
      nodePackages."@angular/cli"
      yarn
    ];
    shellHook = ''
      source <(ng completion script)
      alias bubblewrap="docker run --rm -ti -v $(pwd):/app -w /app ghcr.io/googlechromelabs/bubblewrap:latest";
    '';
}
